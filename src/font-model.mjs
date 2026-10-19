export const FONT_PLUGIN_URL='https://raw.githubusercontent.com/kawanlemesgeourbano/janus/main/plugins/fontes/fontes.janus-plugin.json';
export const FONT_ROLES=['title','subtitle','body'];
export function parseFontPlugin(value){
 if(!value||Object.keys(value).some(k=>!['schema','id','kind','name','description','permissions'].includes(k))||value.schema!==1||value.id!=='fontes'||value.kind!=='settings.fonts'||value.name!=='Fontes'||typeof value.description!=='string'||value.description.length>300||JSON.stringify(value.permissions)!=='["interface.typography"]')throw Error('Plugin de fontes incompatível.');
 return value;
}
export async function verifyFontPlugin(envelope,publicHex){
 if(!envelope||typeof envelope.payload!=='string'||envelope.payload.length>32768||!/^(?:[a-f0-9]{2})+$/i.test(envelope.payload)||!/^[a-f0-9]{128}$/i.test(envelope.signature))throw Error('Pacote de fontes inválido.');
 const decode=hex=>Uint8Array.from(hex.match(/../g),byte=>parseInt(byte,16));
 const key=await crypto.subtle.importKey('raw',decode(publicHex.trim()),'Ed25519',false,['verify']);const payload=decode(envelope.payload);
 if(!await crypto.subtle.verify('Ed25519',key,decode(envelope.signature),payload))throw Error('Assinatura do plugin inválida.');
 return parseFontPlugin(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(payload)));
}
export function validateFontFile(name,bytes){
 if(!name||name.length>255||bytes.byteLength>10*1024*1024)throw Error('Escolha uma fonte de até 10 MB.');
 const header=Array.from(bytes.slice(0,4));const tag=String.fromCharCode(...header);
 if(bytes.length<12||!(['OTTO','wOFF','wOF2','true'].includes(tag)||header.join(',')==='0,1,0,0'))throw Error('Use um arquivo TTF, OTF, WOFF ou WOFF2 válido.');
}
