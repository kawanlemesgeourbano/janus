// Uses the same validators as the application. No dependencies or signing key required.
import {readFile} from 'node:fs/promises';
import {parsePlugin,verifyPlugin} from '../src/plugin-model.mjs';
import {parseFontPlugin,verifyFontPlugin} from '../src/font-model.mjs';
const path=process.argv[2];
if(!path||process.argv.length!==3){console.error('Uso: node scripts/validate-plugin.mjs caminho/do/plugin.json');process.exitCode=1;}
else try{
 const bytes=await readFile(path);if(bytes.length>40000)throw Error('O pacote deve ter até 40.000 bytes.');
 const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));let plugin;
 if(value?.payload){const key=await readFile(new URL('../src-tauri/updater-public-key.hex',import.meta.url),'utf8');
  try{plugin=await verifyPlugin(value,key);}catch{plugin=await verifyFontPlugin(value,key);}
 }else{try{plugin=parsePlugin(value);}catch{plugin=parseFontPlugin(value);}}
 console.log(`Válido: ${plugin.name} (${plugin.id} / ${plugin.kind}).`);
 if(plugin.id==='menu-circular')console.log('Importação local: Plugins+ → Adicionar arquivo. Substitui o layout circular instalado.');
 else console.log('Fontes: descriptor reconhecido; a importação manual não aceita este tipo. Instale pelo catálogo oficial do Janus.');
}catch(error){console.error(`Inválido: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1;}
