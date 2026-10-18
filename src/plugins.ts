// Internal catalog placeholder. Loading, execution and the external plugin
// contract will be designed with the plugin documentation in a later release.
export type PluginCatalogEntry={id:string;name:string;description:string;version:string};
export const pluginCatalog:readonly PluginCatalogEntry[]=Object.freeze([]);
export function renderPluginsPage(container:HTMLElement){
 container.replaceChildren();
 const empty=document.createElement('div');empty.className='plugins-empty';
 const icon=document.createElement('span');icon.className='plugins-empty-icon';icon.textContent='+';icon.setAttribute('aria-hidden','true');
 const title=document.createElement('h2');title.textContent='Nenhum plugin disponível para baixar';
 const text=document.createElement('p');text.textContent='Os plugins publicados aparecerão aqui.';
 const status=document.createElement('span');status.className='plugins-coming';status.textContent='Em breve';
 empty.append(icon,title,text,status);container.append(empty);
}
