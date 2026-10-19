use serde::{Deserialize,Serialize};
use std::{fs,io::Read,time::Duration};
use ed25519_dalek::{Signature,VerifyingKey};
use tauri::Manager;
use crate::{plugins::{directory,Plugins},updates::{atomic,normal_file}};
const URL:&str="https://raw.githubusercontent.com/kawanlemesgeourbano/janus/main/plugins/fontes/fontes.janus-plugin.json";
#[derive(Serialize,Deserialize)]#[serde(deny_unknown_fields)]struct Descriptor{schema:u32,id:String,kind:String,name:String,description:String,permissions:Vec<String>}
#[derive(Deserialize)]#[serde(deny_unknown_fields)]struct Envelope{payload:String,signature:String}
#[derive(Default,Serialize,Deserialize)]pub struct Status{pub installed:bool,pub enabled:bool}
#[derive(Serialize,Deserialize)]#[serde(deny_unknown_fields)]pub struct FontFile{name:String,data:String}
fn verify(bytes:&[u8])->Result<(),String>{
 if bytes.len()>40000{return Err("Pacote muito grande".into())}let env:Envelope=serde_json::from_slice(bytes).map_err(|_|"Pacote inválido")?;
 let payload=hex::decode(env.payload).map_err(|_|"Pacote inválido")?;let signature=Signature::from_slice(&hex::decode(env.signature).map_err(|_|"Assinatura inválida")?).map_err(|_|"Assinatura inválida")?;
 let key:[u8;32]=hex::decode(include_str!("../updater-public-key.hex").trim()).map_err(|_|"Chave inválida")?.try_into().map_err(|_|"Chave inválida")?;
 VerifyingKey::from_bytes(&key).map_err(|_|"Chave inválida")?.verify_strict(&payload,&signature).map_err(|_|"Assinatura inválida")?;
 let d:Descriptor=serde_json::from_slice(&payload).map_err(|_|"Plugin inválido")?;
 if d.schema!=1||d.id!="fontes"||d.kind!="settings.fonts"||d.name!="Fontes"||d.description.len()>300||d.permissions!=["interface.typography"]{return Err("Plugin incompatível".into())}Ok(())
}
fn status()->Result<Status,String>{let dir=directory()?;let package=dir.join("fontes.json");normal_file(&package)?;let state=dir.join("fontes-state.json");normal_file(&state)?;
 let installed=if package.exists(){if fs::metadata(&package).map_err(|e|e.to_string())?.len()>40000{return Err("Pacote inválido".into())}verify(&fs::read(package).map_err(|e|e.to_string())?)?;true}else{false};
 let enabled=fs::read(state).ok().and_then(|v|serde_json::from_slice::<Status>(&v).ok()).unwrap_or_default().enabled;Ok(Status{installed,enabled:installed&&enabled})}
fn set_enabled(enabled:bool)->Result<Status,String>{atomic(&directory()?.join("fontes-state.json"),&serde_json::to_vec(&Status{installed:true,enabled}).map_err(|e|e.to_string())?)?;status()}
#[tauri::command]pub fn font_plugin_status()->Result<Status,String>{status()}
#[tauri::command]pub async fn font_plugin_install(app:tauri::AppHandle)->Result<Status,String>{tauri::async_runtime::spawn_blocking(move||{
 let plugins=app.state::<Plugins>();let _guard=plugins.0.try_lock().map_err(|_|"Aguarde a operação terminar")?;
 let client=reqwest::blocking::Client::builder().https_only(true).connect_timeout(Duration::from_secs(12)).timeout(Duration::from_secs(60)).build().map_err(|_|"Rede indisponível")?;
 let response=client.get(URL).send().and_then(|r|r.error_for_status()).map_err(|_|"Não foi possível baixar o plugin")?;let mut bytes=Vec::new();response.take(40001).read_to_end(&mut bytes).map_err(|_|"Download interrompido")?;verify(&bytes)?;
 atomic(&directory()?.join("fontes.json"),&bytes)?;set_enabled(true)
 }).await.map_err(|_|"Falha ao instalar".to_string())?}
#[tauri::command]pub fn font_plugin_toggle(plugins:tauri::State<Plugins>,enabled:bool)->Result<Status,String>{let _guard=plugins.0.try_lock().map_err(|_|"Aguarde")?;if !status()?.installed{return Err("Baixe o plugin primeiro".into())}set_enabled(enabled)}
fn role_path(role:&str)->Result<std::path::PathBuf,String>{if !["title","subtitle","body"].contains(&role){return Err("Tipo de fonte inválido".into())}Ok(directory()?.join(format!("fontes-{role}.json")))}
fn validate_font(font:&FontFile)->Result<(),String>{if font.name.is_empty()||font.name.chars().count()>255||font.data.len()>20*1024*1024{return Err("Fonte deve ter até 10 MB".into())}let bytes=hex::decode(&font.data).map_err(|_|"Fonte inválida")?;
 if bytes.len()<12||![b"\0\x01\0\0".as_slice(),b"OTTO",b"wOFF",b"wOF2",b"true"].iter().any(|h|bytes.starts_with(h)){return Err("Use TTF, OTF, WOFF ou WOFF2".into())}Ok(())}
#[tauri::command]pub fn font_file(plugins:tauri::State<Plugins>,role:String,action:String,font:Option<FontFile>)->Result<Option<FontFile>,String>{let _guard=plugins.0.try_lock().map_err(|_|"Aguarde")?;if !status()?.installed{return Err("Plugin não instalado".into())}let path=role_path(&role)?;normal_file(&path)?;
 match action.as_str(){"save"=>{let f=font.ok_or("Fonte ausente")?;validate_font(&f)?;atomic(&path,&serde_json::to_vec(&f).map_err(|e|e.to_string())?)?;Ok(Some(f))},"reset"=>{if path.exists(){fs::remove_file(path).map_err(|e|e.to_string())?}Ok(None)},"load"=>{if !path.exists(){return Ok(None)}if fs::metadata(&path).map_err(|e|e.to_string())?.len()>21*1024*1024{return Err("Fonte muito grande".into())}let f=serde_json::from_slice(&fs::read(path).map_err(|e|e.to_string())?).map_err(|_|"Fonte inválida")?;validate_font(&f)?;Ok(Some(f))},_=>Err("Operação inválida".into())}}
#[tauri::command]pub fn font_plugin_remove(plugins:tauri::State<Plugins>)->Result<Status,String>{let _guard=plugins.0.try_lock().map_err(|_|"Aguarde")?;let dir=directory()?;atomic(&dir.join("fontes-state.json"),br#"{"installed":true,"enabled":false}"#)?;for name in ["fontes.json","fontes-state.json","fontes-title.json","fontes-subtitle.json","fontes-body.json"]{let p=dir.join(name);normal_file(&p)?;if p.exists(){fs::remove_file(p).map_err(|e|e.to_string())?}}status()}
#[cfg(test)]mod tests{use super::*;
 #[test]fn roles_are_fixed(){assert!(role_path("../../settings").is_err());}
 #[test]fn fonts_require_valid_headers_and_size(){assert!(validate_font(&FontFile{name:"a.ttf".into(),data:hex::encode(b"OTTO12345678")}).is_ok());assert!(validate_font(&FontFile{name:"a.ttf".into(),data:hex::encode(b"<script>bad</script>")}).is_err());assert!(validate_font(&FontFile{name:"a.ttf".into(),data:"00".repeat(10*1024*1024+1)}).is_err());}
 #[test]fn unsigned_plugins_rejected(){assert!(verify(include_bytes!("../../plugins/fontes/plugin.json")).is_err());assert!(verify(include_bytes!("../../plugins/fontes/fontes.janus-plugin.json")).is_ok());}
}
