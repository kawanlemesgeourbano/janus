#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod ai;
mod paste;
mod update_protocol;
mod updates;
mod plugins;
mod fonts;
mod window_shape;
use paste::*;
use ai::*;
use std::{fs, sync::{Mutex, atomic::{AtomicBool, Ordering}}};
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Default)]
struct Keys(Mutex<Vec<Shortcut>>);
struct Tracking(AtomicBool);
#[derive(serde::Deserialize)]
struct Binding { id: String, shortcut: String }
#[derive(serde::Serialize)]
struct ShortcutIssue { id: String, message: String }

fn settings_path() -> Result<std::path::PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    Ok(exe.parent().ok_or("Pasta do aplicativo indisponível")?.join("dados").join("preferencias.json"))
}
#[tauri::command]
fn load_settings() -> Result<Option<serde_json::Value>, String> {
    let path = settings_path()?;
    if !path.exists() { return Ok(None); }
    serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?).map(Some).map_err(|e| format!("Preferências inválidas: {e}"))
}
#[tauri::command]
fn save_settings(value: serde_json::Value) -> Result<(), String> {
    if updates::is_probe(){return Ok(());}
    let path = settings_path()?;
    fs::create_dir_all(path.parent().unwrap()).map_err(|_| "Não foi possível salvar. Extraia o Janus em uma pasta onde você possa gravar arquivos.".to_string())?;
    let data = serde_json::to_vec_pretty(&value).map_err(|e| e.to_string())?;
    if path.exists() { fs::copy(&path, path.with_extension("bak")).map_err(|e| e.to_string())?; }
    fs::write(path.with_extension("tmp"), data).map_err(|e| e.to_string())?;
    fs::rename(path.with_extension("tmp"), path).map_err(|e| e.to_string())
}
#[tauri::command]
fn copy_text(text: String) -> Result<(), String> {
    if text.len() > 10000 { return Err("Texto excede o limite de cópia".into()); }
    arboard::Clipboard::new().map_err(|e| e.to_string())?.set_text(text).map_err(|e| e.to_string())
}

#[tauri::command]
fn configure_shortcuts(app: tauri::AppHandle, keys: tauri::State<Keys>, bindings: Vec<Binding>, enabled: bool) -> Result<Vec<ShortcutIssue>, String> {
    if bindings.len()>503 { return Err("Limite de 500 divergências por cidade".into()); }
    let mut current = keys.0.lock().map_err(|e| e.to_string())?;
    for key in current.iter() { app.global_shortcut().unregister(*key).map_err(|e| e.to_string())?; }
    current.clear();
    let mut issues=Vec::new();
    if !enabled { return Ok(issues); }
    for binding in bindings {
        if binding.shortcut.is_empty() { continue; }
        let key: Shortcut = match binding.shortcut.parse() {Ok(key)=>key, Err(_)=>{issues.push(ShortcutIssue{id:binding.id,message:"Atalho inválido".into()});continue;}};
        let id=binding.id.clone();
        if current.contains(&key) {issues.push(ShortcutIssue{id:binding.id,message:"Combinação repetida neste catálogo".into()});continue;}
        let result = app.global_shortcut().on_shortcut(key, move |app, _, event| {
            if event.state == ShortcutState::Pressed {
                let _ = app.emit("janus-shortcut", &id);
            }
        });
        if result.is_err() {
            issues.push(ShortcutIssue{id:binding.id,message:"Combinação ocupada ou indisponível no Windows".into()});continue;
        }
        current.push(key);
    }
    Ok(issues)
}

#[tauri::command]
fn display_name() -> String {
    #[cfg(windows)] unsafe {
        use windows::{core::{PWSTR, PCWSTR}, Win32::{Security::Authentication::Identity::{GetUserNameExW,NameDisplay},NetworkManagement::NetManagement::{NetUserGetInfo,NetApiBufferFree,USER_INFO_10}}};
        let mut buf=vec![0u16;1024];let mut len=buf.len() as u32;
        if GetUserNameExW(NameDisplay,Some(PWSTR(buf.as_mut_ptr())),&mut len) {return String::from_utf16_lossy(&buf[..len as usize]).trim_end_matches('\0').into();}
        if let Ok(user)=std::env::var("USERNAME") {
            let user:Vec<u16>=user.encode_utf16().chain(Some(0)).collect();let mut ptr=std::ptr::null_mut();
            if NetUserGetInfo(PCWSTR::null(),PCWSTR(user.as_ptr()),10,&mut ptr)==0 && !ptr.is_null() {
                let info=&*(ptr as *const USER_INFO_10);
                let name=info.usri10_full_name.to_string().unwrap_or_default();
                let _=NetApiBufferFree(Some(ptr as *const _));
                if !name.trim().is_empty(){return name;}
            }
        }
    }
    String::new()
}
#[tauri::command]
fn set_tracking(state: tauri::State<Tracking>, enabled:bool){state.0.store(enabled,Ordering::Relaxed);}
#[tauri::command]
fn dock_window(window:tauri::WebviewWindow, anchor:String, x:Option<i32>, y:Option<i32>) -> Result<(),String> {
    let monitor=window.current_monitor().map_err(|e|e.to_string())?.or(window.primary_monitor().map_err(|e|e.to_string())?).ok_or("Monitor indisponível")?;
    let area=monitor.work_area();let size=window.outer_size().map_err(|e|e.to_string())?;
    let margin=(12.0*monitor.scale_factor()) as i32;
    let left=area.position.x+margin;let top=area.position.y+margin;
    let right=(area.position.x+area.size.width as i32-size.width as i32-margin).max(left);
    let bottom=(area.position.y+area.size.height as i32-size.height as i32-margin).max(top);
    let (px,py)=match anchor.as_str(){"top-left"=>(left,top),"bottom-left"=>(left,bottom),"bottom-right"=>(right,bottom),"custom"=>(x.unwrap_or(right).clamp(left,right),y.unwrap_or(top).clamp(top,bottom)),_=>(right,top)};
    window.set_position(tauri::PhysicalPosition::new(px,py)).map_err(|e|e.to_string())
}

fn main() {
    if updates::helper_mode(){return;}
    if updates::is_probe()&&!updates::probe_allowed(){return;}
    let mut context=tauri::generate_context!();
    if updates::is_probe(){for window in &mut context.config_mut().app.windows{window.visible=false;}}
    let builder=tauri::Builder::default();
    // A hidden, read-only update probe must not activate an already running copy.
    let builder=if updates::is_probe(){builder}else{builder.plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(w) = app.get_webview_window("main") { let _ = w.unminimize(); let _ = w.show(); let _ = w.set_focus(); }
        }))};
    builder
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Keys::default())
        .manage(Tracking(AtomicBool::new(true)))
        .manage(PasteTarget::default())
        .manage(updates::Updates::default())
        .manage(plugins::Plugins::default())
        .on_window_event(|window,event|{if matches!(event,tauri::WindowEvent::CloseRequested{..}){updates::on_close(window.app_handle());}})
        .setup(|app| {
            if matches!(updates::startup(),Ok(true)){app.handle().exit(0);return Ok(());}
            let handle=app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_millis(33));
                let Some(window)=handle.get_webview_window("main") else {break;};
                #[cfg(windows)] remember_foreground(&handle.state::<PasteTarget>());
                if !handle.state::<Tracking>().0.load(Ordering::Relaxed) || window.is_minimized().unwrap_or(true){continue;}
                #[cfg(windows)] unsafe {
                    use windows::Win32::{Foundation::POINT,UI::WindowsAndMessaging::GetCursorPos};
                    let mut p=POINT::default();
                    if GetCursorPos(&mut p).is_ok() {
                        if let (Ok(origin),Ok(scale))=(window.outer_position(),window.scale_factor()) {
                            let _=window.emit("janus-cursor",((p.x-origin.x) as f64/scale,(p.y-origin.y) as f64/scale));
                        }
                    }
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_settings, save_settings, copy_text, paste_text,configure_shortcuts,display_name,set_tracking,dock_window,ai_status,ai_connect,ai_remove,ai_ask,updates::update_status,updates::update_apply,updates::update_check,updates::update_automatic,updates::update_healthy,updates::update_is_probe,fonts::font_plugin_status,fonts::font_plugin_install,fonts::font_plugin_toggle,fonts::font_plugin_remove,fonts::font_file,plugins::plugin_status,plugins::plugin_import,plugins::plugin_install,plugins::plugin_toggle,plugins::plugin_remove,window_shape::radial_region])
        .run(context).expect("Não foi possível iniciar o Janus");
}
