import {normalize} from './model.mjs';
// Project labels may come from preferences created by earlier versions.
export function projectLabel(name){return String(name).replace(/\s*(?:[·|–—-]\s*)?contrato\b.*$/iu,'').trim();}
const noteKey=value=>normalize(value).replace(/^\s*\d+[.)-]?\s*/,'').replace(/[^a-z0-9]+/g,' ').trim();
export function findGuidanceNote(notes,name){
 const key=noteKey(name);
 const entry=Object.entries(notes).find(([heading])=>noteKey(heading)===key);
 if(entry)return entry[1];
 // Match only a unique abbreviated heading, within the current project.
 const matches=Object.entries(notes).filter(([heading])=>{const candidate=noteKey(heading);return Math.min(candidate.length,key.length)>=20&&(candidate.startsWith(key+' ')||key.startsWith(candidate+' '));});
 return matches.length===1?matches[0][1]:'';
}

export function mergeProjects(base,overrides){const merged=new Map(base.map(p=>[p.id,p]));for(const project of overrides)merged.set(project.id,project);return [...merged.values()];}
export function validProject(v){
 if(!v||typeof v.id!=='string'||v.id.length>120||typeof v.name!=='string'||!v.name.trim()||v.name.length>100||typeof v.source!=='string'||v.source.length>200)return false;
 if(v.documentText!==undefined&&(typeof v.documentText!=='string'||v.documentText.length>500000))return false;
 if(!Array.isArray(v.items)||v.items.length>500||!v.items.every(i=>i&&typeof i.key==='string'&&typeof i.category==='string'&&i.category.length<=120&&typeof i.text==='string'&&i.text.length<=4000))return false;
 if(v.guidance!==undefined){const g=v.guidance;if(!g||!Array.isArray(g.parameters)||g.parameters.length>100||!g.parameters.every(p=>p&&typeof p.title==='string'&&p.title.length<=200&&typeof p.text==='string'&&p.text.length<=50000)||!g.notes||typeof g.notes!=='object'||Array.isArray(g.notes)||Object.entries(g.notes).length>500||!Object.entries(g.notes).every(([k,t])=>k.length<=200&&typeof t==='string'&&t.length<=20000))return false;}
 return true;
}
export function parameterLabel(title){const key=noteKey(title);if(key==='elementos a serem considerados como area construida')return 'Área construída: o que considerar';if(key==='elementos a nao serem considerados como area construida')return 'Área construída: o que não considerar';if(key==='criterios para o vinculo'||key==='parametros para o vinculo')return 'Critérios para o vínculo';const text=String(title).trim().toLocaleLowerCase('pt-BR');return text.charAt(0).toLocaleUpperCase('pt-BR')+text.slice(1);}
