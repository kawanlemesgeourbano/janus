import {invoke} from '@tauri-apps/api/core';
import publicKey from '../src-tauri/updater-public-key.hex?raw';
import {PLUGIN_URL,verifyPlugin} from './plugin-model.mjs';
export type Layout={schema:number;id:string;kind:string;name:string;description:string;permissions:string[];palette:{paper:string;hub:string;ink:string;accent:string};slots:{action:string;label:string;detail:string;icon:string}[]};
type Status={installed:boolean;enabled:boolean;layout:Layout|null;message:string};
const packageKey='janus.plugins.menu-circular.package',enabledKey='janus.plugins.menu-circular.enabled';
export async function setupPluginsPage(container:HTMLElement,native:boolean,onChange:(layout:Layout|null)=>Promise<void>){
 let state:Status={installed:false,enabled:false,layout:null,message:'Disponível para baixar'},busy=false;
 const browserStatus=async():Promise<Status>=>{const data=localStorage.getItem(packageKey);if(!data)return {installed:false,enabled:false,layout:null,message:'Disponível para baixar'};try{const layout=await verifyPlugin(JSON.parse(data),publicKey),enabled=localStorage.getItem(enabledKey)==='true';return {installed:true,enabled,layout,message:enabled?'Ativo':'Instalado · desativado'};}catch{return {installed:true,enabled:false,layout:null,message:'Pacote inválido. Remova e baixe novamente.'};}};
 const operation=async(action:'install'|'toggle'|'remove',enabled?:boolean)=>{
  if(busy)return;busy=true;render();
  try{
   if(native)state=await invoke<Status>(action==='install'?'plugin_install':action==='toggle'?'plugin_toggle':'plugin_remove',action==='toggle'?{enabled}:{});
   else{
    if(action==='install'){const response=await fetch(PLUGIN_URL,{cache:'no-store'});if(!response.ok)throw Error('Não foi possível baixar o plugin do GitHub.');const text=await response.text();if(text.length>40000)throw Error('Pacote muito grande.');await verifyPlugin(JSON.parse(text),publicKey);localStorage.setItem(packageKey,text);localStorage.setItem(enabledKey,'false');}
    else if(action==='toggle')localStorage.setItem(enabledKey,String(enabled));
    else{localStorage.removeItem(packageKey);localStorage.removeItem(enabledKey);}
    state=await browserStatus();
   }
   await onChange(state.enabled?state.layout:null);
  }catch(error){state.message=String(error);}
  finally{busy=false;render();}
 };
 const render=()=>{
  container.replaceChildren();const card=document.createElement('article');card.className='plugin-card';
  const art=document.createElement('div');art.className='plugin-card-art';art.setAttribute('aria-hidden','true');art.innerHTML='<span class="plugin-art-hub">J</span><i></i><i></i><i></i><i></i><i></i>';
  const copy=document.createElement('div');copy.className='plugin-card-copy';const eyebrow=document.createElement('small');eyebrow.textContent='INTERFACE';const title=document.createElement('h3');title.textContent='Menu circular';const description=document.createElement('p');description.textContent='Transforme o Janus em um menu circular, com as funções ao redor e os atalhos de cópia no mesmo formato.';
  const status=document.createElement('p');status.className='plugin-state';status.setAttribute('role','status');status.textContent=busy?'Aguarde…':state.message;
  const actions=document.createElement('div');actions.className='plugin-actions';
  if(!state.installed){const install=document.createElement('button');install.className='primary';install.textContent='↓ Baixar plugin';install.disabled=busy;install.onclick=()=>void operation('install');actions.append(install);}
  else{
   const toggle=document.createElement('button');toggle.className='plugin-enable';toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(state.enabled));toggle.textContent=state.enabled?'Desativar':'Ativar';toggle.disabled=busy||(!state.layout&&!state.enabled);toggle.onclick=()=>void operation('toggle',!state.enabled);
   const remove=document.createElement('button');remove.className='plugin-remove';remove.textContent='Remover';remove.disabled=busy;remove.onclick=()=>void operation('remove');actions.append(toggle,remove);
  }
  const permission=document.createElement('small');permission.className='plugin-permission';permission.textContent='Acesso: apresentação da interface. Não altera projetos, parâmetros ou divergências.';
  copy.append(eyebrow,title,description,status,actions,permission);card.append(art,copy);container.append(card);
  const note=document.createElement('p');note.className='plugins-note';note.textContent='O download é opcional. Ative e desative quando quiser; a escolha não depende do projeto ativo.';container.append(note);
 };
 try{state=native?await invoke<Status>('plugin_status'):await browserStatus();await onChange(state.enabled?state.layout:null);}catch(error){state.message=String(error);}
 render();
}
