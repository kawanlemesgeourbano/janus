import {invoke} from '@tauri-apps/api/core';
import publicKey from '../src-tauri/updater-public-key.hex?raw';
import {PLUGIN_URL,verifyPlugin,parsePlugin} from './plugin-model.mjs';
export type Layout={schema:number;id:string;kind:string;name:string;description:string;permissions:string[];palette:{paper:string;hub:string;ink:string;accent:string};slots:{action:string;label:string;detail:string;icon:string}[]};
type Status={installed:boolean;enabled:boolean;layout:Layout|null;message:string};
const packageKey='janus.plugins.menu-circular.package',enabledKey='janus.plugins.menu-circular.enabled';
export async function setupPluginsPage(container:HTMLElement,native:boolean,onChange:(layout:Layout|null)=>Promise<void>){
 let state:Status={installed:false,enabled:false,layout:null,message:'Disponível para baixar'},busy=false;
 const browserStatus=async():Promise<Status>=>{const data=localStorage.getItem(packageKey);if(!data)return {installed:false,enabled:false,layout:null,message:'Disponível para baixar'};try{const stored=JSON.parse(data),layout=stored.local===true?parsePlugin(stored.layout):await verifyPlugin(stored,publicKey),enabled=localStorage.getItem(enabledKey)==='true';return {installed:true,enabled,layout,message:enabled?'Ativo':'Instalado · desativado'};}catch{return {installed:true,enabled:false,layout:null,message:'Pacote inválido. Remova e baixe novamente.'};}};
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
  container.replaceChildren();const toolbar=document.createElement('div');toolbar.className='plugin-import-bar';
  const label=document.createElement('label');label.className='plugin-import-button';label.textContent='+ Adicionar arquivo';
  const file=document.createElement('input');file.type='file';file.accept='.json,.janus-plugin.json,application/json';file.setAttribute('aria-label','Adicionar plugin manualmente');file.disabled=busy;
  file.onchange=async()=>{const selected=file.files?.[0];if(!selected||busy)return;busy=true;render();try{if(selected.size>40000)throw Error('O plugin deve ter até 40 KB.');const content=await selected.text();
   if(native)state=await invoke<Status>('plugin_import',{content});else{const data=JSON.parse(content);let layout:Layout;if(data.payload)layout=await verifyPlugin(data,publicKey);else layout=parsePlugin(data);localStorage.setItem(packageKey,JSON.stringify({local:true,layout}));localStorage.setItem(enabledKey,'true');state=await browserStatus();}
   await onChange(state.layout);window.dispatchEvent(new CustomEvent('janus-plugin-imported'));
  }catch(error){state.message=String(error);}finally{busy=false;render();}};
  label.append(file);toolbar.append(label);container.append(toolbar);
  const card=document.createElement('article');card.className='plugin-card plugin-list-row';const copy=document.createElement('div');copy.className='plugin-card-copy';
  const title=document.createElement('h3');title.textContent=state.layout?.name||'Menu circular';const status=document.createElement('p');status.className='plugin-state';status.setAttribute('role','status');status.textContent=busy?'Aguarde…':state.message;copy.append(title,status);
  const actions=document.createElement('div');actions.className='plugin-actions';
  const button=(text:string,action:()=>void)=>{const item=document.createElement('button');item.textContent=text;item.disabled=busy;item.onclick=action;return item;};
  if(!state.installed)actions.append(button('Baixar',()=>void operation('install')));
  else{const toggle=button(state.enabled?'Desativar':'Ativar',()=>void operation('toggle',!state.enabled));toggle.setAttribute('role','switch');toggle.setAttribute('aria-checked',String(state.enabled));toggle.disabled=busy||(!state.layout&&!state.enabled);actions.append(toggle,button('Remover',()=>void operation('remove')));}
  card.append(copy,actions);container.append(card);
 };

 try{state=native?await invoke<Status>('plugin_status'):await browserStatus();await onChange(state.enabled?state.layout:null);}catch(error){state.message=String(error);}
 render();
}
