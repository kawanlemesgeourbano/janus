export const PLUGIN_ID='menu-circular';
export const PLUGIN_URL='https://raw.githubusercontent.com/kawanlemesgeourbano/janus/main/plugins/menu-circular/menu-circular.janus-plugin.json';
export const ACTIONS=['divergences','parameters','plugins','agent','settings'];
export function parsePlugin(value){
 const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 const keys=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
 if(!keys(value,['schema','id','kind','name','description','permissions','palette','slots']))throw Error('Descrição de plugin inválida.');
 if(!value||value.schema!==1||value.id!==PLUGIN_ID||value.kind!=='layout.radial'||!text(value.name,64)||!text(value.description,300)||JSON.stringify(value.permissions)!==JSON.stringify(['interface.layout']))throw Error('Plugin incompatível com esta interface.');
 if(!keys(value.palette,['paper','hub','ink','accent'])||['paper','hub','ink','accent'].some(key=>!/^#[0-9a-f]{6}$/i.test(value.palette[key])))throw Error('Cores inválidas no plugin.');
 if(!Array.isArray(value.slots)||value.slots.length!==5||value.slots.some(s=>!keys(s,['action','label','detail','icon']))||new Set(value.slots.map(s=>s.action)).size!==5||value.slots.some(s=>!ACTIONS.includes(s.action)||!text(s.label,40)||!text(s.detail,64)||!['warning','parameters','plugins','agent','settings'].includes(s.icon)))throw Error('Menu de plugin inválido.');
 return value;
}
export async function verifyPlugin(envelope,publicHex){
 if(!envelope||typeof envelope.payload!=='string'||envelope.payload.length>32768||!/^(?:[a-f0-9]{2})+$/i.test(envelope.payload)||!/^[a-f0-9]{128}$/i.test(envelope.signature))throw Error('Pacote de plugin inválido.');
 const decode=hex=>Uint8Array.from(hex.match(/../g),byte=>parseInt(byte,16));
 const key=await crypto.subtle.importKey('raw',decode(publicHex.trim()),'Ed25519',false,['verify']);
 const payload=decode(envelope.payload);
 if(!await crypto.subtle.verify('Ed25519',key,decode(envelope.signature),payload))throw Error('Assinatura do plugin inválida.');
 return parsePlugin(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(payload)));
}
