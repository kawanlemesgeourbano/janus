import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
type Status={automatic:boolean;lastCheck:number;ready:boolean;version:string;message:string;current:string};
export async function setupUpdater(native:boolean){
 const status=document.getElementById('update-status')!,button=document.getElementById('check-update') as HTMLButtonElement,automatic=document.getElementById('auto-update') as HTMLInputElement;
 const show=(state:Status)=>{automatic.checked=state.automatic;status.textContent=state.message;status.classList.toggle('update-ready',state.ready);};
 if(!native){button.disabled=true;automatic.disabled=true;status.textContent='Atualizações disponíveis no aplicativo Windows.';return;}
 let busy=false;
 const check=async(force:boolean)=>{if(busy)return;busy=true;button.disabled=true;automatic.disabled=true;status.textContent='Verificando atualizações…';try{show(await invoke<Status>('update_check',{force}));}catch(error){status.textContent=String(error);}finally{busy=false;button.disabled=false;automatic.disabled=false;}};
 await listen<Status>('janus-update',({payload})=>show(payload));
 button.onclick=()=>void check(true);
 automatic.onchange=async()=>{const enabled=automatic.checked;try{show(await invoke<Status>('update_automatic',{enabled}));}catch(error){automatic.checked=!enabled;status.textContent=String(error);}};
 try{
  show(await invoke<Status>('update_status'));
  // The UI has rendered successfully. Network requests must never gate health reporting.
  await invoke('update_healthy');
  void check(false);
 }catch{status.textContent='Não foi possível acessar a pasta de atualização. A cópia local continua disponível.';}
}
