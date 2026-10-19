import type {Layout} from './plugin-manager';
import {RADIAL,COMPACT,PICKER,WORKSPACE,orient,sector,circle,pickerPage,brief} from './radial-model.mjs';
export type Geometry={width:number;height:number;cx:number;cy:number;hub:number;inner:number;outer:number;side?:string};
export type RadialFrame={geometry:Geometry;polygons:number[][][]};
const icons:Record<string,string>={warning:'<path d="M12 3 2 21h20z"/><path d="M12 9v5m0 3v1"/>',parameters:'<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/>',plugins:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>',agent:'<rect x="4" y="6" width="16" height="13" rx="5"/><path d="M12 2v4M8 11v2m8-2v2m-6 3h4"/>',settings:'<path d="m9.7 3-.5 2-1.5.9-2-.5-2.3 4 1.5 1.4v1.8L3.4 14l2.3 4 2-.5 1.5.9.5 2h4.6l.5-2 1.5-.9 2 .5 2.3-4-1.5-1.4v-1.8l1.5-1.4-2.3-4-2 .5-1.5-.9-.5-2z"/><circle cx="12" cy="12" r="3"/>'};
const svgIcon=(name:string)=>`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]||icons.plugins}</svg>`;
export class RadialView{
 readonly element:HTMLElement;
 constructor(private root:HTMLElement,private layout:Layout,private left=false){
  this.element=document.createElement('section');this.element.id='radial-root';this.element.className='radial-surface';this.element.setAttribute('aria-label','Menu circular do Janus');root.querySelector('.shell')!.append(this.element);
  for(const [key,color] of Object.entries(layout.palette))root.style.setProperty('--radial-'+key,color);
 }
 destroy(){this.element.remove();}
 private base(compact=false,picking=false,workspace=false){
  const mode=picking?'picker':compact?'compact':workspace?'workspace':'home';this.element.classList.toggle('radial-enter',this.element.dataset.mode!==mode);this.element.dataset.mode=mode;this.element.replaceChildren();const geometry:Geometry=orient(picking?PICKER:compact?COMPACT:workspace?WORKSPACE:RADIAL,this.left);
  document.documentElement.style.setProperty('--radial-cx',geometry.cx+'px');document.documentElement.style.setProperty('--radial-cy',geometry.cy+'px');this.root.style.setProperty('--radial-hub-size',geometry.hub+'px');this.root.style.setProperty('--radial-cx',geometry.cx+'px');this.root.style.setProperty('--radial-cy',geometry.cy+'px');
  const hub=document.createElement('div');hub.className='radial-hub';hub.style.left=geometry.cx-geometry.hub+'px';hub.style.top=geometry.cy-geometry.hub+'px';hub.style.width=hub.style.height=geometry.hub*2+'px';this.element.append(hub);
  return {geometry,hub,polygons:[circle(geometry)]} as RadialFrame&{hub:HTMLElement};
 }
 private petals(labels:{title:string;detail:string;icon?:string;number:string;selected?:boolean;click:()=>void;focus?:()=>void}[],frame:RadialFrame){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('radial-shapes');const defs=document.createElementNS(svg.namespaceURI,'defs');defs.innerHTML='<linearGradient id="radial-paper-depth" x1="0" y1="0" x2=".6" y2="1"><stop offset="0%" stop-color="'+this.layout.palette.paper+'"/><stop offset="100%" stop-color="#e5e1d8"/></linearGradient>';svg.append(defs);svg.setAttribute('viewBox',`0 0 ${frame.geometry.width} ${frame.geometry.height}`);svg.setAttribute('aria-hidden','true');this.element.prepend(svg);
  labels.forEach((item,index)=>{
   const shape=sector(index,labels.length,frame.geometry);frame.polygons.push(sector(index,labels.length,{...frame.geometry,inner:0,outer:frame.geometry.outer+4}).points);
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',shape.path);if(item.selected)path.classList.add('selected');path.style.setProperty('--petal-delay',`${index*35}ms`);svg.append(path);
   const button=document.createElement('button');button.className='radial-petal';const xs=shape.points.map((p:number[])=>p[0]),ys=shape.points.map((p:number[])=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;button.style.inset='auto';button.style.left=x+'px';button.style.top=y+'px';button.style.width=w+'px';button.style.height=h+'px';button.style.transformOrigin=`${frame.geometry.cx-x}px ${frame.geometry.cy-y}px`;button.style.clipPath='polygon('+shape.points.map((p:number[])=>`${(p[0]-x)/w*100}% ${(p[1]-y)/h*100}%`).join(',')+')';button.setAttribute('aria-label',item.title);if(item.selected!==undefined)button.setAttribute('aria-pressed',String(item.selected));button.style.setProperty('--petal-delay',`${index*35}ms`);button.dataset.radialIndex=String(index);button.onclick=item.click;
   if(item.focus){button.onpointerenter=item.focus;button.onfocus=item.focus;}
   const content=document.createElement('span');content.className='radial-petal-copy';content.style.left=(shape.label[0]-x)+'px';content.style.top=(shape.label[1]-y)+'px';

   if(item.icon){const icon=document.createElement('span');icon.className='radial-icon';icon.innerHTML=svgIcon(item.icon);content.append(icon);}
   const title=document.createElement('strong');title.textContent=item.title;content.append(title);button.append(content);this.element.append(button);
  });
 }
 main(compact:boolean,_counts:{divergences:number;parameters:number},action:(name:string)=>void,workspace=false,_route=''):RadialFrame{
  const frame=this.base(compact,false,workspace);this.element.setAttribute('aria-label',compact?'Janus circular recolhido':'Menu circular do Janus');
  if(!compact&&!workspace)this.petals(this.layout.slots.map(slot=>({title:slot.label,detail:'',icon:slot.icon,number:'',click:()=>action(slot.action)})),frame);
  if(workspace){const back=document.createElement('button');back.className='radial-home';back.textContent='← Menu circular';back.onclick=()=>action('home');frame.hub.append(back);return frame;}
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
