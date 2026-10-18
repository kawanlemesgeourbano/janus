use crate::update_protocol as protocol;
use serde::{Deserialize,Serialize};
use std::{fs,io::{Read,Write},path::{Path,PathBuf},process::Command,sync::{Mutex,atomic::{AtomicBool,Ordering}},time::{Duration,SystemTime,UNIX_EPOCH}};
use tauri::{Emitter,Manager};
pub const CURRENT:&str=env!("CARGO_PKG_VERSION");
pub fn is_probe()->bool{std::env::args().nth(1).as_deref()==Some("--janus-update-probe")}
#[tauri::command]pub fn update_is_probe()->bool{is_probe()}
pub fn probe_allowed()->bool{root().ok().and_then(|r|cache(&r).ok()).and_then(|dir|receipt(&dir)).is_some_and(|r|r.phase=="applied"&&r.version==CURRENT)}
#[derive(Default)]pub struct Updates{gate:Mutex<()>,busy:AtomicBool}
#[derive(Clone,Serialize,Deserialize)]
#[serde(default,rename_all="camelCase")]
pub struct Status{pub automatic:bool,pub last_check:u64,pub ready:bool,pub version:String,pub message:String,pub current:String,pub failed_version:String}
impl Default for Status{fn default()->Self{Self{automatic:true,last_check:0,ready:false,version:String::new(),message:"Nenhuma atualização preparada.".into(),current:CURRENT.into(),failed_version:String::new()}}}
#[derive(Clone,Serialize,Deserialize)]struct Receipt{phase:String,version:String,entry:String,nonce:String,existing:Vec<String>}
fn now()->u64{SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()}
fn root()->Result<PathBuf,String>{std::env::current_exe().map_err(|e|e.to_string())?.parent().ok_or("Pasta indisponível")?.canonicalize().map_err(|e|e.to_string())}
fn normal_file(path:&Path)->Result<(),String>{
    if let Ok(meta)=fs::symlink_metadata(path){
        #[cfg(windows)]{use std::os::windows::fs::MetadataExt;if meta.file_attributes()&0x400!=0{return Err("Links não são permitidos na pasta de atualização".into());}}
        if meta.file_type().is_symlink(){return Err("Links não são permitidos na atualização".into());}
    }Ok(())
}
fn cache(root:&Path)->Result<PathBuf,String>{let path=root.join(".janus-update");normal_file(&path)?;fs::create_dir_all(&path).map_err(|_|"Não foi possível gravar a atualização nesta pasta")?;Ok(path)}
fn atomic(path:&Path,bytes:&[u8])->Result<(),String>{normal_file(path)?;let tmp=path.with_file_name(format!(".{}.janus-new",path.file_name().ok_or("Arquivo inválido")?.to_string_lossy()));normal_file(&tmp)?;let mut file=fs::File::create(&tmp).map_err(|e|e.to_string())?;file.write_all(bytes).and_then(|_|file.sync_all()).map_err(|e|e.to_string())?;drop(file);fs::rename(tmp,path).map_err(|e|e.to_string())}
fn read_status(dir:&Path)->Status{let mut value:Status=fs::read(dir.join("state.json")).ok().and_then(|b|serde_json::from_slice(&b).ok()).unwrap_or_default();value.current=CURRENT.into();value}
fn write_status(dir:&Path,status:&Status)->Result<(),String>{atomic(&dir.join("state.json"),&serde_json::to_vec(status).map_err(|e|e.to_string())?)}
fn receipt(dir:&Path)->Option<Receipt>{fs::read(dir.join("receipt.json")).ok().and_then(|b|serde_json::from_slice(&b).ok())}
fn write_receipt(dir:&Path,r:&Receipt)->Result<(),String>{atomic(&dir.join("receipt.json"),&serde_json::to_vec(r).map_err(|e|e.to_string())?)}
fn client()->Result<reqwest::blocking::Client,String>{reqwest::blocking::Client::builder().https_only(true).user_agent("Janus-portable-updater").connect_timeout(Duration::from_secs(12)).timeout(Duration::from_secs(180)).redirect(reqwest::redirect::Policy::limited(5)).build().map_err(|_|"Rede indisponível".into())}
fn download(client:&reqwest::blocking::Client,url:&str,max:u64)->Result<Vec<u8>,String>{
    let response=client.get(url).send().and_then(|r|r.error_for_status()).map_err(|_|"Não foi possível consultar o GitHub. Tente novamente mais tarde.")?;
    if response.content_length().is_some_and(|size|size>max){return Err("Download excede o limite permitido".into());}
    let mut bytes=Vec::new();response.take(max+1).read_to_end(&mut bytes).map_err(|_|"O download foi interrompido")?;
    if bytes.len() as u64>max{return Err("Download excede o limite permitido".into());}Ok(bytes)
}
fn staged(dir:&Path)->Result<(protocol::Manifest,Vec<(String,Vec<u8>)>),String>{
    for name in ["manifest.json","manifest.sig","package.zip"]{normal_file(&dir.join(name))?;}
    let manifest=fs::read(dir.join("manifest.json")).map_err(|_|"Descrição ausente")?;
    let signature=fs::read_to_string(dir.join("manifest.sig")).map_err(|_|"Assinatura ausente")?;
    let m=protocol::verify(&manifest,&signature)?;
    if fs::metadata(dir.join("package.zip")).map_err(|_|"Pacote ausente")?.len()>protocol::MAX_PACKAGE{return Err("Pacote muito grande".into());}
    let files=protocol::unpack(&m,&fs::read(dir.join("package.zip")).map_err(|_|"Pacote ausente")?)?;Ok((m,files))
}
fn check(dir:&Path,force:bool,app:&tauri::AppHandle)->Result<Status,String>{
    let mut state=read_status(dir);
    if state.ready {match staged(dir){Ok((m,_)) if protocol::newer(&m.version,CURRENT)=>return Ok(state),_=>{state.ready=false;}}}
    if !force&&(!state.automatic||now().saturating_sub(state.last_check)<6*3600){return Ok(state);}
    state.last_check=now();write_status(dir,&state)?;
    let result=(||{
        let client=client()?;let data=download(&client,protocol::FEED,16384)?;let sig=download(&client,&format!("{}.sig",protocol::FEED),256)?;
        let sig=String::from_utf8(sig).map_err(|_|"Assinatura inválida")?;let m=protocol::verify(&data,&sig)?;
        if !protocol::newer(&m.version,CURRENT){state.message="Seu Janus está atualizado.".into();state.version.clear();return Ok(());}
        if m.version==state.failed_version{state.message="Esta atualização falhou anteriormente. Aguardando uma versão corrigida.".into();return Ok(());}
        state.message=format!("Baixando a versão {}…",m.version);let _=app.emit("janus-update",&state);
        let bytes=download(&client,&m.url,protocol::MAX_PACKAGE)?;protocol::unpack(&m,&bytes)?;
        atomic(&dir.join("package.zip"),&bytes)?;atomic(&dir.join("manifest.json"),&data)?;atomic(&dir.join("manifest.sig"),sig.as_bytes())?;
        state.ready=true;state.version=m.version;state.message="Atualização pronta. Será aplicada ao fechar o Janus.".into();Ok::<(),String>(())
    })();
    if let Err(error)=result{state.message=error;state.ready=false;}
    write_status(dir,&state)?;Ok(state)
}
#[tauri::command]pub fn update_status()->Result<Status,String>{Ok(read_status(&cache(&root()?)?))}
#[tauri::command]pub fn update_automatic(updates:tauri::State<Updates>,enabled:bool)->Result<Status,String>{
    let _guard=updates.gate.try_lock().map_err(|_|"Aguarde a verificação terminar")?;let dir=cache(&root()?)?;let mut status=read_status(&dir);status.automatic=enabled;write_status(&dir,&status)?;Ok(status)
}
#[tauri::command]pub async fn update_check(app:tauri::AppHandle,force:bool)->Result<Status,String>{
    if app.state::<Updates>().busy.swap(true,Ordering::SeqCst){return Err("Uma verificação já está em andamento".into());}
    let handle=app.clone();let result=tauri::async_runtime::spawn_blocking(move||{let updates=handle.state::<Updates>();let _guard=updates.gate.lock().map_err(|_|"Atualizador ocupado")?;let status=check(&cache(&root()?)?,force,&handle)?;let _=handle.emit("janus-update",&status);Ok(status)}).await.map_err(|_|"Não foi possível verificar atualizações".to_string());
    app.state::<Updates>().busy.store(false,Ordering::SeqCst);result?
}
#[tauri::command]pub fn update_healthy()->Result<(),String>{
    let dir=cache(&root()?)?;if let Some(r)=receipt(&dir){if r.phase=="applied"&&r.version==CURRENT{atomic(&dir.join("healthy"),r.nonce.as_bytes())?;}}
    Ok(())
}
fn entry_name(value:&str)->bool{!value.is_empty()&&value.len()<200&&!value.contains(['/', '\\', ':'])&&value.to_ascii_lowercase().ends_with(".exe")}
fn spawn_helper(dir:&Path,mode:&str,entry:&str)->Result<(),String>{
    if !entry_name(entry){return Err("Nome do executável inválido".into());}
    let helper=dir.join("JanusUpdater.exe");normal_file(&helper)?;
    if std::env::current_exe().map_err(|e|e.to_string())?!=helper{fs::copy(std::env::current_exe().map_err(|e|e.to_string())?,&helper).map_err(|_|"Não foi possível preparar o auxiliar")?;}
    let mut cmd=Command::new(helper);cmd.arg(mode).arg(std::process::id().to_string()).arg(entry).current_dir(dir);
    #[cfg(windows)]{use std::os::windows::process::CommandExt;cmd.creation_flags(0x08000000);}
    cmd.spawn().map_err(|_|"Não foi possível iniciar o auxiliar de atualização")?;Ok(())
}
pub fn on_close(app:&tauri::AppHandle){
    if is_probe(){return;}
    let updates=app.state::<Updates>();if updates.busy.load(Ordering::SeqCst){return;}
    let Ok(_guard)=updates.gate.try_lock() else{return;};
    let result=(||{let dir=cache(&root()?)?;if !read_status(&dir).ready{return Ok(());}
        let (manifest,_)=staged(&dir)?;if !protocol::newer(&manifest.version,CURRENT){return Ok(());}
        let entry=std::env::current_exe().map_err(|e|e.to_string())?.file_name().ok_or("Executável inválido")?.to_string_lossy().into_owned();spawn_helper(&dir,"--janus-apply-update",&entry)
    })();
    if let Err(error)=result{if let Ok(root)=root(){if let Ok(dir)=cache(&root){let mut state=read_status(&dir);state.message=format!("Atualização adiada: {error}");let _=write_status(&dir,&state);}}}
}
pub fn startup()->Result<bool,String>{
    if is_probe(){return Ok(false);}
    let dir=cache(&root()?)?;
    if let Some(r)=receipt(&dir){
        if !entry_name(&r.entry){return Err("Registro de recuperação inválido".into());}
        if r.phase=="applying"||r.phase=="rollback-needed"||r.phase=="applied"{spawn_helper(&dir,"--janus-recover-update",&r.entry)?;return Ok(true);}
    }Ok(false)
}
fn backup_files(root:&Path,dir:&Path,entry:&str)->Result<Vec<String>,String>{
    let backup=dir.join("backup");normal_file(&backup)?;
    if backup.exists(){
        // Only the fixed allowlist is ever removed, never preferences or user directories.
        for name in protocol::FILES{let name=if name=="Janus.exe"{entry}else{name};let p=backup.join(name);normal_file(&p)?;if p.exists(){fs::remove_file(p).map_err(|e|e.to_string())?;}}
    }fs::create_dir_all(&backup).map_err(|e|e.to_string())?;
    let mut existing=Vec::new();for name in protocol::FILES{
        let name=if name=="Janus.exe"{entry}else{name};let src=root.join(name);normal_file(&src)?;
        if src.exists(){fs::copy(src,backup.join(name)).map_err(|e|e.to_string())?;existing.push(name.into());}
    }Ok(existing)
}
fn restore(root:&Path,dir:&Path,r:&Receipt)->Result<(),String>{
    if !entry_name(&r.entry){return Err("Nome inválido".into());}
    let backup=dir.join("backup");normal_file(&backup)?;
    for name in protocol::FILES{
        let name=if name=="Janus.exe"{r.entry.as_str()}else{name};let target=root.join(name);normal_file(&target)?;
        if r.existing.iter().any(|n|n==name){let src=backup.join(name);normal_file(&src)?;let bytes=fs::read(src).map_err(|e|e.to_string())?;if fs::read(&target).ok().as_deref()!=Some(bytes.as_slice()){atomic(&target,&bytes)?;}}
        else if target.exists(){fs::remove_file(target).map_err(|e|e.to_string())?;}
    }
    let mut status=read_status(dir);status.ready=false;status.failed_version=r.version.clone();status.last_check=now();status.message="A versão anterior foi restaurada porque a atualização não iniciou corretamente.".into();write_status(dir,&status)?;
    let mut r=r.clone();r.phase="rolled-back".into();write_receipt(dir,&r)
}
fn apply(root:&Path,dir:&Path,entry:&str)->Result<(),String>{
    let (manifest,files)=staged(dir)?;
    if !protocol::newer(&manifest.version,CURRENT){return Err("Atualização antiga ou já instalada".into());}
    install_verified(root,dir,entry,&manifest.version,files)
}
fn install_verified(root:&Path,dir:&Path,entry:&str,version:&str,files:Vec<(String,Vec<u8>)>)->Result<(),String>{
    let existing=backup_files(root,dir,entry)?;
    let mut r=Receipt{phase:"applying".into(),version:version.into(),entry:entry.into(),nonce:format!("{}-{}",now(),std::process::id()),existing};
    write_receipt(dir,&r)?;
    let result=(||{for (name,content) in files{let target=if name=="Janus.exe"{entry}else{&name};atomic(&root.join(target),&content)?;}Ok::<(),String>(())})();
    if let Err(error)=result{restore(root,dir,&r)?;return Err(error);}
    r.phase="applied".into();write_receipt(dir,&r)?;
    let mut status=read_status(dir);status.ready=false;status.message="Atualização instalada. Abra o Janus normalmente.".into();write_status(dir,&status)
}
fn validate_install(root:&Path,dir:&Path,entry:&Path)->Result<(),String>{
    let mut r=receipt(dir).ok_or("Registro de atualização ausente")?;
    let mut command=Command::new(entry);command.arg("--janus-update-probe").current_dir(root);
    #[cfg(windows)]{use std::os::windows::process::CommandExt;command.creation_flags(0x08000000);}
    match command.spawn(){
        Ok(mut child)=>{
            let healthy=wait_parent(child.id(),entry,Some((&dir.join("healthy"),&r.nonce)));
            // The probe has no user interaction, API calls or preference writes.
            let _=child.kill();let _=child.wait();
            match healthy{Ok(true)=>{r.phase="healthy".into();write_receipt(dir,&r)},_=>restore(root,dir,&r)}
        }
        Err(_)=>restore(root,dir,&r),
    }
}

#[cfg(windows)]fn wait_parent(pid:u32,entry:&Path,watch:Option<(&Path,&str)>)->Result<bool,String>{
    use windows::{core::PWSTR,Win32::{Foundation::{CloseHandle,WAIT_OBJECT_0},System::Threading::{OpenProcess,QueryFullProcessImageNameW,WaitForSingleObject,TerminateProcess,PROCESS_NAME_FORMAT,PROCESS_QUERY_LIMITED_INFORMATION,PROCESS_SYNCHRONIZE,PROCESS_TERMINATE}}};
    unsafe{
        let process=match OpenProcess(PROCESS_SYNCHRONIZE|PROCESS_QUERY_LIMITED_INFORMATION|if watch.is_some(){PROCESS_TERMINATE}else{Default::default()},false,pid){Ok(p)=>p,Err(error)=>{if error.code().0 as u32==0x80070057{return Ok(false);}return Err("Não foi possível aguardar o processo do Janus".into());}};
        let result=(||{
            let mut name=vec![0u16;32768];let mut length=name.len() as u32;QueryFullProcessImageNameW(process,PROCESS_NAME_FORMAT(0),PWSTR(name.as_mut_ptr()),&mut length).map_err(|_|"Processo indisponível")?;
            let actual=PathBuf::from(String::from_utf16_lossy(&name[..length as usize]));
            if actual.canonicalize().map_err(|_|"Processo indisponível")?!=entry.canonicalize().map_err(|_|"Executável indisponível")?{return Err("O processo não pertence a esta instalação".into());}
            for _ in 0..900{
                if let Some((path,nonce))=watch{if fs::read_to_string(path).ok().as_deref()==Some(nonce){return Ok(true);}}
                if WaitForSingleObject(process,100)==WAIT_OBJECT_0{return Ok(false);}
            }
            if watch.is_some(){TerminateProcess(process,1).map_err(|_|"Não foi possível encerrar a versão com falha")?;WaitForSingleObject(process,10000);return Ok(false);}
            Err("O Janus ainda está em execução; atualização adiada".into())
        })();let _=CloseHandle(process);result
    }
}
#[cfg(not(windows))]fn wait_parent(_pid:u32,_entry:&Path,_watch:Option<(&Path,&str)>)->Result<bool,String>{Err("Atualizador disponível no Windows".into())}
pub fn helper_mode()->bool{
    let args:Vec<String>=std::env::args().collect();let Some(mode)=args.get(1) else{return false;};
    if !["--janus-apply-update","--janus-recover-update"].contains(&mode.as_str()){return false;}
    let result=(||{
        if args.len()!=4||!entry_name(&args[3]){return Err("Argumentos inválidos".into());}
        let exe=std::env::current_exe().map_err(|e|e.to_string())?.canonicalize().map_err(|e|e.to_string())?;
        let dir=exe.parent().ok_or("Auxiliar inválido")?;if dir.file_name().and_then(|s|s.to_str())!=Some(".janus-update"){return Err("Pasta do auxiliar inválida".into());}
        let root=dir.parent().ok_or("Pasta inválida")?;normal_file(dir)?;let entry=root.join(&args[3]);
        let pid=args[2].parse().map_err(|_|"Processo inválido")?;
        wait_parent(pid,&entry,None)?;
        if mode=="--janus-apply-update"{apply(root,dir,&args[3])?;validate_install(root,dir,&entry)?;}else{let r=receipt(dir).ok_or("Registro ausente")?;restore(root,dir,&r)?;Command::new(&entry).current_dir(root).spawn().map_err(|_|"Versão anterior restaurada; abra o Janus novamente")?;}
        Ok::<(),String>(())
    })();
    if let Err(error)=result{if let Ok(exe)=std::env::current_exe(){if let Some(dir)=exe.parent(){let _=fs::write(dir.join("last-error.txt"),error);}}}
    true
}

#[cfg(test)]mod tests{
    use super::*;
    #[test]fn rollback_preserves_private_data_and_reverses_partial_changes(){
        let root=std::env::temp_dir().join(format!("janus-rollback-{}-{}",std::process::id(),now()));fs::create_dir_all(root.join("dados")).unwrap();let dir=cache(&root).unwrap();
        fs::write(root.join("Janus.exe"),b"old-exe").unwrap();fs::write(root.join("CREDITS.md"),b"old-notice").unwrap();fs::write(root.join("dados/preferencias.json"),b"private-data").unwrap();
        let existing=backup_files(&root,&dir,"Janus.exe").unwrap();let r=Receipt{phase:"applying".into(),version:"9.0.0".into(),entry:"Janus.exe".into(),nonce:"test".into(),existing};
        fs::write(root.join("Janus.exe"),b"broken").unwrap();fs::write(root.join("LEIA-ME.txt"),b"new").unwrap();restore(&root,&dir,&r).unwrap();
        assert_eq!(fs::read(root.join("Janus.exe")).unwrap(),b"old-exe");assert_eq!(fs::read(root.join("dados/preferencias.json")).unwrap(),b"private-data");assert!(!root.join("LEIA-ME.txt").exists());assert_eq!(fs::read(root.join("CREDITS.md")).unwrap(),b"old-notice");
        assert_eq!(read_status(&dir).failed_version,"9.0.0");
        fs::remove_dir_all(root).unwrap();
    }
    #[test]fn entry_names_cannot_escape_installation(){for name in ["../Janus.exe","C:\\Janus.exe","/Janus.exe","file.txt",""]{assert!(!entry_name(name));}assert!(entry_name("Meu Janus.exe"));}
    #[test]fn verified_transaction_replaces_files_and_records_health_without_touching_projects(){
        let root=std::env::temp_dir().join(format!("janus-install-{}-{}",std::process::id(),now()));fs::create_dir_all(root.join("dados")).unwrap();let dir=cache(&root).unwrap();
        fs::write(root.join("Janus.exe"),b"MZprevious").unwrap();fs::write(root.join("dados/preferencias.json"),b"private").unwrap();
        let files=protocol::FILES.iter().map(|name|(name.to_string(),if *name=="Janus.exe"{b"MZnew".to_vec()}else{b"notice".to_vec()})).collect();
        install_verified(&root,&dir,"Janus.exe","9.0.0",files).unwrap();
        assert_eq!(fs::read(root.join("Janus.exe")).unwrap(),b"MZnew");assert_eq!(fs::read(dir.join("backup/Janus.exe")).unwrap(),b"MZprevious");assert_eq!(receipt(&dir).unwrap().phase,"applied");assert_eq!(fs::read(root.join("dados/preferencias.json")).unwrap(),b"private");
        fs::remove_dir_all(root).unwrap();
    }
    #[cfg(windows)]#[test]fn child_process_fixture(){
        let Ok(path)=std::env::var("JANUS_TEST_HEALTH_PATH") else{return;};
        std::thread::sleep(Duration::from_millis(300));
        if std::env::var("JANUS_TEST_HEALTH_MODE").as_deref()==Ok("healthy"){fs::write(path,b"test-nonce").unwrap();std::thread::sleep(Duration::from_millis(300));}
    }
    #[cfg(windows)]#[test]fn windows_waits_for_real_exit_and_recognizes_frontend_health(){
        use std::os::windows::process::CommandExt;
        let path=std::env::temp_dir().join(format!("janus-health-{}",std::process::id()));let _=fs::remove_file(&path);let exe=std::env::current_exe().unwrap();
        for healthy in [true,false]{
            let _=fs::remove_file(&path);
            let mut child=Command::new(&exe).args(["--exact","updates::tests::child_process_fixture"]).env("JANUS_TEST_HEALTH_PATH",&path).env("JANUS_TEST_HEALTH_MODE",if healthy{"healthy"}else{"exit"}).stdout(std::process::Stdio::null()).stderr(std::process::Stdio::null()).creation_flags(0x08000000).spawn().unwrap();
            let result=wait_parent(child.id(),&exe,Some((&path,"test-nonce"))).unwrap();assert_eq!(result,healthy);child.wait().unwrap();
        }
        let _=fs::remove_file(path);
    }
}
