import type {Layout} from './plugin-manager';
import {RADIAL,COMPACT,PICKER,sector,circle,pickerPage,brief} from './radial-model.mjs';
export type Geometry={width:number;height:number;cx:number;cy:number;hub:number;inner:number;outer:number};
export type RadialFrame={geometry:Geometry;polygons:number[][][]};
const icons:Record<string,string>={warning:'<path d="M12 3 2 21h20z"/><path d="M12 9v5m0 3v1"/>',parameters:'<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/>',plugins:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>',agent:'<rect x="4" y="6" width="16" height="13" rx="5"/><path d="M12 2v4M8 11v2m8-2v2m-6 3h4"/>',settings:'<path d="m10 3-.6 3-2 1-3-.2-2 3 2 2-.2 3 2 2 3-1 2 1 1 3h4l1-3 2-1 2 1 2-3-2-2 .2-3-2-2-3 1-2-1-.5-3z"/><circle cx="12" cy="12" r="3"/>'};
const svgIcon=(name:string)=>`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.plugins}</svg>`;
export class RadialView{
 readonly element:HTMLElement;
 constructor(private root:HTMLElement,private layout:Layout){
  this.element=document.createElement('section');this.element.id='radial-root';this.element.className='radial-surface';this.element.setAttribute('aria-label','Menu circular do Janus');root.querySelector('.shell')!.append(this.element);
  for(const [key,color] of Object.entries(layout.palette))root.style.setProperty('--radial-'+key,color);
 }
 destroy(){this.element.remove();}
 private base(compact=false,picking=false){
  this.element.replaceChildren();const geometry:Geometry=picking?PICKER:compact?COMPACT:RADIAL;
  this.root.style.setProperty('--radial-cx',geometry.cx+'px');this.root.style.setProperty('--radial-cy',geometry.cy+'px');
  const hub=document.createElement('div');hub.className='radial-hub';hub.style.left=geometry.cx-geometry.hub+'px';hub.style.top=geometry.cy-geometry.hub+'px';hub.style.width=hub.style.height=geometry.hub*2+'px';this.element.append(hub);
  return {geometry,hub,polygons:[circle(geometry)]} as RadialFrame&{hub:HTMLElement};
 }
 private petals(labels:{title:string;detail:string;icon?:string;number:string;selected?:boolean;click:()=>void;focus?:()=>void}[],frame:RadialFrame){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('radial-shapes');svg.setAttribute('viewBox',`0 0 ${frame.geometry.width} ${frame.geometry.height}`);svg.setAttribute('aria-hidden','true');this.element.prepend(svg);
  labels.forEach((item,index)=>{
   const shape=sector(index,labels.length,frame.geometry);frame.polygons.push(shape.points);
   const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',shape.path);if(item.selected)path.classList.add('selected');svg.append(path);
   const button=document.createElement('button');button.className='radial-petal';button.style.clipPath=`path('${shape.path}')`;button.setAttribute('aria-label',item.title);if(item.selected!==undefined)button.setAttribute('aria-pressed',String(item.selected));button.dataset.radialIndex=String(index);button.onclick=item.click;
   if(item.focus){button.onpointerenter=item.focus;button.onfocus=item.focus;}
   const content=document.createElement('span');content.className='radial-petal-copy';content.style.left=shape.label[0]+'px';content.style.top=shape.label[1]+'px';
   const key=document.createElement('kbd');key.textContent=item.number;content.append(key);
   if(item.icon){const icon=document.createElement('span');icon.className='radial-icon';icon.innerHTML=svgIcon(item.icon);content.append(icon);}
   const title=document.createElement('strong');title.textContent=item.title;const detail=document.createElement('small');detail.textContent=item.detail;content.append(title,detail);button.append(content);this.element.append(button);
  });
 }
 main(compact:boolean,counts:{divergences:number;parameters:number},action:(name:string)=>void):RadialFrame{
  const frame=this.base(compact);this.element.setAttribute('aria-label',compact?'Janus circular recolhido':'Menu circular do Janus');
  if(!compact)this.petals(this.layout.slots.map((slot,index)=>({title:slot.label,detail:slot.action==='divergences'?`${counts.divergences} divergências`:slot.action==='parameters'?`${counts.parameters} parâmetros`:slot.detail,icon:slot.icon,number:String(index+1),click:()=>action(slot.action)})),frame);
  const gi=document.createElement('img');gi.src='./gi-logo.jpg';gi.alt='GI Geotecnologia';gi.className='radial-gi';frame.hub.append(gi);
  const hint=document.createElement('small');hint.className='radial-main-hint';hint.dataset.help='';hint.textContent=compact?'Ctrl + Shift + D':'1–5 com o menu em foco';frame.hub.append(hint);
  return frame;
 }
 picker(options:{title:string;items:{text:string}[];index:number;note:string;guidance:boolean;copyMode:string;pick:(index:number)=>void;select:(index:number)=>void;close:()=>void;toggleGuidance:()=>void}):RadialFrame{
  const frame=this.base(false,true),page=pickerPage(options.items.length,options.index);this.element.setAttribute('aria-label','Selecionar divergência no menu circular');
  this.petals(options.items.slice(page.start,page.end).map((item,offset)=>{const index=page.start+offset;return {title:brief(item.text),detail:'Clique para '+(options.copyMode==='paste'?'colar':'copiar'),number:String(index+1),selected:index===options.index,click:()=>options.pick(index),focus:()=>options.select(index)};}),frame);
  const preview=document.createElement('div');preview.className='radial-preview';
  const top=document.createElement('div');top.className='radial-preview-top';const label=document.createElement('small');label.textContent=options.title;const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Fechar opções da divergência');close.onclick=options.close;top.append(label,close);
  const full=document.createElement('p');full.className='radial-full-text';full.textContent=options.items[options.index]?.text||'Nenhuma opção disponível.';full.setAttribute('aria-live','polite');
  const copy=document.createElement('button');copy.className='radial-confirm';copy.textContent=(options.copyMode==='paste'?'Colar':'Copiar')+' · Enter';copy.disabled=!options.items.length;copy.onclick=()=>options.pick(options.index);
  const orientation=document.createElement('button');orientation.className='radial-guidance-toggle';orientation.textContent=options.guidance?'Ocultar orientação':'Mostrar orientação';orientation.setAttribute('aria-expanded',String(options.guidance));orientation.onclick=options.toggleGuidance;
  const note=document.createElement('p');note.className='radial-note';note.hidden=!options.guidance;note.textContent=options.note;
  const pages=document.createElement('div');pages.className='radial-pages';
  const prev=document.createElement('button');prev.textContent='‹';prev.setAttribute('aria-label','Página anterior');prev.disabled=page.page===0;prev.onclick=()=>options.select(page.start-1);
  const counter=document.createElement('span');counter.textContent=`${options.index+1}/${options.items.length} · ${page.page+1}/${page.pages}`;
  const next=document.createElement('button');next.textContent='›';next.setAttribute('aria-label','Próxima página');next.disabled=page.page>=page.pages-1;next.onclick=()=>options.select(page.end);
  pages.append(prev,counter,next);preview.append(top,full,copy,orientation,note,pages);frame.hub.append(preview);return frame;
 }
 focus(index:number){this.element.querySelector<HTMLButtonElement>(`[data-radial-index="${index}"]`)?.focus({preventScroll:true});}
}
