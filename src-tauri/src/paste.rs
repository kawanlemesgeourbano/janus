use std::sync::atomic::{AtomicIsize,Ordering};
pub struct PasteTarget(pub AtomicIsize);
impl Default for PasteTarget{fn default()->Self{Self(AtomicIsize::new(0))}}
#[cfg(windows)]
pub fn remember_foreground(target:&PasteTarget){unsafe{
 use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow,GetWindowThreadProcessId,GetClassNameW,IsWindowVisible};
 let hwnd=GetForegroundWindow();let mut pid=0;GetWindowThreadProcessId(hwnd,Some(&mut pid));
 let mut buf=[0u16;128];let len=GetClassNameW(hwnd,&mut buf);let class=String::from_utf16_lossy(&buf[..len.max(0) as usize]);
 if pid!=0&&pid!=std::process::id()&&IsWindowVisible(hwnd).as_bool()&&!matches!(class.as_str(),"Shell_TrayWnd"|"Progman"|"WorkerW"){
  target.0.store(hwnd.0 as isize,Ordering::Relaxed);
 }
}}
#[tauri::command]
pub async fn paste_text(text:String,target:tauri::State<'_,PasteTarget>)->Result<bool,String>{
 if text.is_empty()||text.len()>10000{return Err("Texto vazio ou muito longo".into());}
 let handle=target.0.load(Ordering::Relaxed);
 tauri::async_runtime::spawn_blocking(move||{
  let mut clipboard=arboard::Clipboard::new().map_err(|_|"Área de transferência indisponível".to_string())?;
  clipboard.set_text(text).map_err(|_|"Não foi possível copiar o texto".to_string())?;
  #[cfg(windows)] unsafe{
   use windows::Win32::{Foundation::HWND,UI::{WindowsAndMessaging::{IsWindow,SetForegroundWindow,GetForegroundWindow},Input::KeyboardAndMouse::{GetAsyncKeyState,SendInput,INPUT,INPUT_0,INPUT_KEYBOARD,KEYBDINPUT,KEYEVENTF_KEYUP,VK_CONTROL,VK_SHIFT,VK_MENU,VIRTUAL_KEY}}};
   let hwnd=HWND(handle as *mut _);
   if handle==0||!IsWindow(Some(hwnd)).as_bool(){return Ok(false);}
   // Do not paste while the user still holds shortcut modifiers.
   for _ in 0..120{if [VK_CONTROL,VK_SHIFT,VK_MENU].iter().all(|k|GetAsyncKeyState(k.0 as i32)>=0){break;}std::thread::sleep(std::time::Duration::from_millis(10));}
   if [VK_CONTROL,VK_SHIFT,VK_MENU].iter().any(|k|GetAsyncKeyState(k.0 as i32)<0){return Ok(false);}
   if !SetForegroundWindow(hwnd).as_bool(){return Ok(false);}
   std::thread::sleep(std::time::Duration::from_millis(80));
   if GetForegroundWindow()!=hwnd{return Ok(false);}
   let key=|vk:VIRTUAL_KEY,up:bool|INPUT{r#type:INPUT_KEYBOARD,Anonymous:INPUT_0{ki:KEYBDINPUT{wVk:vk,dwFlags:if up{KEYEVENTF_KEYUP}else{Default::default()},..Default::default()}}};
   let inputs=[key(VK_CONTROL,false),key(VIRTUAL_KEY(0x56),false),key(VIRTUAL_KEY(0x56),true),key(VK_CONTROL,true)];
   return Ok(SendInput(&inputs,std::mem::size_of::<INPUT>() as i32)==4);
  }
  #[cfg(not(windows))] {let _=handle;Ok(false)}
 }).await.map_err(|_|"Não foi possível concluir a colagem".to_string())?
}
