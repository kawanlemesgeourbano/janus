import { normalize } from './model.mjs';

export function greeting(name, hour) {
  const firstTwo=String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).join(' ');
  const salutation=hour>=5&&hour<12?'Bom dia':hour>=12&&hour<18?'Boa tarde':hour>=18&&hour<24?'Boa noite':'Olá';
  return {title:`${salutation}${firstTwo?', '+firstTwo:''}!`,message:hour>=5&&hour<9?'Trabalhando cedo hoje? Vamos começar com calma.':hour>=9&&hour<12?'Tudo à mão para uma boa manhã.':hour>=12&&hour<18?'Como está a tarde? Seu próximo texto está aqui.':hour>=18?'Boa noite. Vamos seguir com tranquilidade.':'Ainda por aqui? Lembre de fazer uma pausa.'};
}
export function defaultShortcut(index,prefix='Control+Shift') {
  const extended='Control+Shift+Alt';
  if(index<9)return `${prefix}+${index+1}`;
  if(index<21)return `${prefix}+F${index-8}`;
  if(index<30)return `${extended}+${index-20}`;
  if(index<42)return `${extended}+F${index-29}`;
  if(index<68)return `${extended}+${String.fromCharCode(65+index-42)}`;
  return '';
}
export function shortcutFromEvent(e) {
  if(['Control','Alt','Shift','Meta'].includes(e.key))return null;
  if(e.metaKey||(!e.ctrlKey&&!e.altKey))throw Error('Use Ctrl ou Alt junto com a tecla.');
  const key=e.code==='Space'?'Space':/^Key[A-Z]$/.test(e.code)?e.code.slice(3):/^Digit[0-9]$/.test(e.code)?e.code.slice(5):/^F\d{1,2}$/.test(e.code)?e.code:null;
  if(!key)throw Error('Use uma letra, número, Espaço ou F1–F12.');
  const parts=[];if(e.ctrlKey)parts.push('Control');if(e.shiftKey)parts.push('Shift');if(e.altKey)parts.push('Alt');parts.push(key);
  return parts.join('+');
}
export const shortcutText = s => s ? s.replace('Control','Ctrl').replace('Space','Espaço').split('+').join(' + ') : 'Definir atalho';

// Conservative extraction for numbered contractual catalogs. Every candidate is
// reviewed before activation. Document content is data, never executable commands.
export function parseDivergencePages(pages) {
  const items=[];let category='',buffer='',bufferPage=1,notes=false;
  const flush=()=>{if(buffer.trim().length>=8)items.push({key:`pdf-${items.length+1}`,category,text:buffer.trim().replace(/00,00(?=\s*m[²2])/g,'{X}').replace(/\blotes? A e B\b/g,m=>m.replace('A e B','{A e B}')).replace(/\blote A\b/g,'lote {A}'),page:bufferPage});buffer='';};
  for(const [pageIndex,page] of pages.entries()) {
    for(const raw of page.split('\n')) {
      const line=raw.trim().replace(/\s+/g,' ');if(!line)continue;
      const heading=line.match(/^\d{1,2}\s*[.)–-]\s*(.{3,100})$/);
      if(heading && heading[1]===heading[1].toLocaleUpperCase('pt-BR') && /[A-ZÀ-Ý]/.test(heading[1])) {flush();category=heading[1];notes=false;continue;}
      if(!category || /^\d+$/.test(line))continue;
      if(/^(?:aten[cç][aã]o|observa[cç][aã]o)/.test(normalize(line))) {flush();notes='warning';continue;}
      if(/^(?:no vincular|par[aâ]metros|[➢])|^[-–]\s/.test(normalize(line))) {flush();notes='actions';continue;}
      if(notes==='actions')continue;
      if(notes==='warning') {if(/^(?:Área|O lote|A edificação|Não consta|Construção|Possível|Possivelmente|Divergência)/.test(line))notes=false;else continue;}
      if(!buffer && /^[A-ZÀ-Ý\s/()]{3,}$/.test(line)){category+=' '+line;continue;}
      const starts=/^(?:Área|O lote|A edificação|Não consta|Não foi possível|Não é possível|Construção|Possível|Possivelmente|Divergência|Verificar|Devido|Através|Trecho|Impossível|Há |De acordo|Na foto|Seguindo)/.test(line);
      if(buffer && (/[.!?]$/.test(buffer)||starts))flush();
      if(!buffer)bufferPage=pageIndex+1;
      buffer+=(buffer?' ':'')+line;
    }
  }
  flush();return items.slice(0,500);
}
