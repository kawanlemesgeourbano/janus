import {normalize} from './model.mjs';
export const parameterTitles=[
 'ELEMENTOS A SEREM CONSIDERADOS COMO ÁREA CONSTRUÍDA',
 'ELEMENTOS A NÃO SEREM CONSIDERADOS COMO ÁREA CONSTRUÍDA',
 'CRITÉRIOS PARA O VÍNCULO'
];
const clean=s=>s.trim().replace(/^[\uF0B7\uF0D8➢•]\s*/,'').replace(/\s+/g,' ');
const heading=line=>{const match=line.match(/^\d{1,2}[.)–-]\s*(.{3,100})$/);return match&&match[1]===match[1].toLocaleUpperCase('pt-BR')?match[1]:null;};
function paragraphs(lines){
 const out=[];
 for(const raw of lines){const line=raw.trim();if(!line||/^PÁGINA \d+$/.test(line))continue;
  if(/^[\uF0B7\uF0D8➢•]|^-\s|^ATENÇÃO|^No vincular/i.test(line)||!out.length)out.push(line.replace(/^[\uF0B7\uF0D8➢•]\s*/,'• '));
  else out[out.length-1]+=' '+line;
 }
 // The supplied PDF visually reads 10%; extraction splits the digits in this line.
 return out.join('\n').replace(/\b1\s+0%/g,'10%');
}
export function parseGuidance(pages){
 const lines=pages.join('\n').split('\n').map(s=>s.trim()).filter(s=>s&&!/^PÁGINA \d+$/.test(s));
 const parameters=parameterTitles.map(title=>({title,text:''}));
 /** @type {Record<string,string>} */
 const notes={};let parameter=-1,parameterLines=[],currentCategory='',block=[];
 const flushParameter=()=>{if(parameter>=0)parameters[parameter].text=paragraphs(parameterLines);parameterLines=[];};
 const flushNotes=()=>{
  if(!currentCategory)return;
  const actionIndex=block.findIndex(l=>/no vincular/i.test(l));
  const warnings=[];
  for(let i=0;i<(actionIndex<0?block.length:actionIndex);i++)if(/^ATENÇÃO|^OBSERVAÇÃO/i.test(block[i])){
   let warning=block[i];
   while(i+1<(actionIndex<0?block.length:actionIndex)&&! /^(Área|O lote|A edificação|Não |Construção|Possível|Possivelmente|Através|Na foto|Divergência|No vincular)/.test(clean(block[i+1])))warning+=' '+block[++i];
   warnings.push(warning);
  }
  const actionLines=actionIndex<0?[]:block.slice(actionIndex);
  const text=[...warnings,paragraphs(actionLines)].filter(Boolean).join('\n\n');
  if(text)notes[normalize(currentCategory)]=text;
 };
 for(let i=0;i<lines.length;i++){
  let line=lines[i];const name=heading(line);
  if(name){flushParameter();parameter=-1;flushNotes();currentCategory=name;block=[];continue;}
  if(currentCategory){block.push(line);continue;}
  let normalized=normalize(clean(line));
  if(normalized==='elementos a nao serem considerados como area'&&normalize(lines[i+1]||'')==='construida'){line+=' '+lines[++i];normalized=normalize(clean(line));}
  const slot=normalized==='elementos a serem considerados como area construida'?0:normalized==='elementos a nao serem considerados como area construida'?1:/^(parametros|criterios) para o vinculo$/.test(normalized)?2:-1;
  if(slot>=0){flushParameter();parameter=slot;continue;}
  if(/^parametros para as divergencias$/.test(normalized)){flushParameter();parameter=-1;continue;}
  if(parameter>=0)parameterLines.push(line);
 }
 flushParameter();flushNotes();return {parameters,notes};
}
