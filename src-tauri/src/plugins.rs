use ed25519_dalek::{Signature,VerifyingKey};
use serde::{Deserialize,Serialize};
use std::{fs,io::Read,path::PathBuf,sync::Mutex,time::Duration};
use tauri::Manager;
use crate::updates::{atomic,normal_file};
const ID:&str="menu-circular";
const URL:&str="https://raw.githubusercontent.com/kawanlemesgeourbano/janus/main/plugins/menu-circular/menu-circular.janus-plugin.json";
#[derive(Default)]pub struct Plugins(pub Mutex<()>);
#[derive(Clone,Serialize,Deserialize)]#[serde(deny_unknown_fields)]pub struct Palette{paper:String,hub:String,ink:String,accent:String}
#[derive(Clone,Serialize,Deserialize)]#[serde(deny_unknown_fields)]pub struct Slot{action:String,label:String,detail:String,icon:String}
#[derive(Clone,Serialize,Deserialize)]#[serde(deny_unknown_fields)]pub struct Layout{schema:u32,id:String,kind:String,name:String,description:String,permissions:Vec<String>,palette:Palette,slots:Vec<Slot>}
#[derive(Deserialize)]#[serde(deny_unknown_fields)]struct Envelope{payload:String,signature:String}
#[derive(Serialize)]pub struct Status{installed:bool,enabled:bool,layout:Option<Layout>,message:String}
#[derive(Default,Serialize,Deserialize)]struct State{enabled:bool}
fn validate(layout:Layout)->Result<Layout,String>{
    let text=|s:&str,max|!s.trim().is_empty()&&s.chars().count()<=max;
    let color=|s:&str|s.len()==7&&s.starts_with('#')&&s[1..].bytes().all(|c|c.is_ascii_hexdigit());
    let actions=["divergences","parameters","plugins","agent","settings"];
    if layout.schema!=1||layout.id!=ID||layout.kind!="layout.radial"||layout.permissions!=["interface.layout"]||!text(&layout.name,64)||!text(&layout.description,300)
        || [&layout.palette.paper,&layout.palette.hub,&layout.palette.ink,&layout.palette.accent].iter().any(|s|!color(s))
        || layout.slots.len()!=5||actions.iter().any(|action|layout.slots.iter().filter(|s|s.action==*action).count()!=1)
        || layout.slots.iter().any(|s|!text(&s.label,40)||!text(&s.detail,64)||!["warning","parameters","plugins","agent","settings"].contains(&s.icon.as_str())){return Err("Plugin incompatível com esta interface".into());}
    Ok(layout)
}
fn verify_with_key(bytes:&[u8],key:&[u8;32])->Result<Layout,String>{
    if bytes.len()>40000{return Err("Pacote de plugin muito grande".into());}
    let envelope:Envelope=serde_json::from_slice(bytes).map_err(|_|"Pacote de plugin inválido")?;
    if envelope.payload.len()>32768||envelope.signature.len()!=128{return Err("Pacote de plugin inválido".into());}
    let payload=hex::decode(envelope.payload).map_err(|_|"Pacote inválido")?;
    let signature=Signature::from_slice(&hex::decode(envelope.signature).map_err(|_|"Assinatura inválida")?).map_err(|_|"Assinatura inválida")?;
    VerifyingKey::from_bytes(key).map_err(|_|"Chave inválida")?.verify_strict(&payload,&signature).map_err(|_|"Assinatura do plugin inválida")?;
    validate(serde_json::from_slice(&payload).map_err(|_|"Descrição do plugin inválida")?)
}
fn verify(bytes:&[u8])->Result<Layout,String>{let key=hex::decode(include_str!("../updater-public-key.hex").trim()).map_err(|_|"Chave inválida")?.try_into().map_err(|_|"Chave inválida")?;verify_with_key(bytes,&key)}
fn directory()->Result<PathBuf,String>{let exe=std::env::current_exe().map_err(|e|e.to_string())?;let root=exe.parent().ok_or("Pasta indisponível")?.join("dados");normal_file(&root)?;let dir=root.join("plugins");normal_file(&dir)?;fs::create_dir_all(&dir).map_err(|_|"Não foi possível salvar plugins nesta pasta")?;Ok(dir)}
fn read_status()->Result<Status,String>{
    let dir=directory()?;let file=dir.join("menu-circular.json");normal_file(&file)?;normal_file(&dir.join("state.json"))?;
    let enabled=fs::read(dir.join("state.json")).ok().and_then(|b|serde_json::from_slice::<State>(&b).ok()).unwrap_or_default().enabled;
    if !file.exists(){return Ok(Status{installed:false,enabled:false,layout:None,message:"Disponível para baixar".into()});}
    let result=(||{if fs::metadata(&file).map_err(|e|e.to_string())?.len()>40000{return Err("Pacote muito grande".into());}verify(&fs::read(file).map_err(|e|e.to_string())?)})();
    match result{Ok(layout)=>Ok(Status{installed:true,enabled,layout:Some(layout),message:if enabled{"Ativo"}else{"Instalado · desativado"}.into()}),Err(error)=>Ok(Status{installed:true,enabled:false,layout:None,message:error})}
}
#[tauri::command]pub fn plugin_status()->Result<Status,String>{read_status()}
#[tauri::command]pub async fn plugin_install(app:tauri::AppHandle)->Result<Status,String>{
    tauri::async_runtime::spawn_blocking(move||{
        let plugins=app.state::<Plugins>();let _guard=plugins.0.try_lock().map_err(|_|"Aguarde a operação terminar")?;
        let client=reqwest::blocking::Client::builder().https_only(true).user_agent("Janus-plugins").connect_timeout(Duration::from_secs(12)).timeout(Duration::from_secs(60)).redirect(reqwest::redirect::Policy::limited(5)).build().map_err(|_|"Rede indisponível")?;
        let response=client.get(URL).send().and_then(|r|r.error_for_status()).map_err(|_|"Não foi possível baixar o plugin do GitHub")?;
        let mut bytes=Vec::new();response.take(40001).read_to_end(&mut bytes).map_err(|_|"Download interrompido")?;verify(&bytes)?;
        let dir=directory()?;atomic(&dir.join("menu-circular.json"),&bytes)?;atomic(&dir.join("state.json"),br#"{"enabled":false}"#)?;read_status()
    }).await.map_err(|_|"Não foi possível instalar o plugin".to_string())?
}
#[tauri::command]pub fn plugin_toggle(plugins:tauri::State<Plugins>,enabled:bool)->Result<Status,String>{
    let _guard=plugins.0.try_lock().map_err(|_|"Aguarde a operação terminar")?;let status=read_status()?;
    if enabled&&(!status.installed||status.layout.is_none()){return Err("Baixe um plugin válido antes de ativar".into());}
    atomic(&directory()?.join("state.json"),&serde_json::to_vec(&State{enabled}).map_err(|e|e.to_string())?)?;read_status()
}
#[tauri::command]pub fn plugin_remove(plugins:tauri::State<Plugins>)->Result<Status,String>{
    let _guard=plugins.0.try_lock().map_err(|_|"Aguarde a operação terminar")?;let dir=directory()?;let file=dir.join("menu-circular.json");normal_file(&file)?;
    atomic(&dir.join("state.json"),br#"{"enabled":false}"#)?;if file.exists(){fs::remove_file(file).map_err(|_|"Não foi possível remover o plugin")?;}read_status()
}
#[cfg(test)]mod tests{
    use super::*;use ed25519_dalek::{SigningKey,Signer};
    #[test]fn layout_requires_signature_and_only_interface_permission(){
        let key=SigningKey::from_bytes(&[8;32]);let payload=include_bytes!("../../plugins/menu-circular/plugin.json");
        let wrap=|data:&[u8]|serde_json::to_vec(&serde_json::json!({"payload":hex::encode(data),"signature":hex::encode(key.sign(data).to_bytes())})).unwrap();
        assert!(verify_with_key(&wrap(payload),&key.verifying_key().to_bytes()).is_ok());assert!(verify(&wrap(payload)).is_err());
        let mut unsafe_layout:serde_json::Value=serde_json::from_slice(payload).unwrap();unsafe_layout["permissions"]=serde_json::json!(["project.write"]);
        assert!(verify_with_key(&wrap(&serde_json::to_vec(&unsafe_layout).unwrap()),&key.verifying_key().to_bytes()).is_err());
    }
}
