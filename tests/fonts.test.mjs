import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FONT_ROLES,parseFontPlugin,verifyFontPlugin,validateFontFile} from '../src/font-model.mjs';
const descriptor=JSON.parse(readFileSync(new URL('../plugins/fontes/plugin.json',import.meta.url)));
const envelope=JSON.parse(readFileSync(new URL('../plugins/fontes/fontes.janus-plugin.json',import.meta.url)));
const key=readFileSync(new URL('../src-tauri/updater-public-key.hex',import.meta.url),'utf8');
test('font plugin is signed and limited to typography',async()=>{
 assert.deepEqual(await verifyFontPlugin(envelope,key),descriptor);
 assert.throws(()=>parseFontPlugin({...descriptor,permissions:['files.write']}));
 assert.throws(()=>parseFontPlugin({...descriptor,script:'alert(1)'}));
 await assert.rejects(verifyFontPlugin({...envelope,payload:envelope.payload.replace(/^../,'00')},key));
 await assert.rejects(verifyFontPlugin(descriptor,key));
 assert.deepEqual(FONT_ROLES,['title','subtitle','body']);
});
test('font uploads accept supported headers and reject renamed executables or excess size',()=>{
 for(const header of ['OTTO','wOFF','wOF2','true'])validateFontFile('exemplo.otf',new TextEncoder().encode(header+'12345678'));
 validateFontFile('exemplo.ttf',new Uint8Array([0,1,0,0,0,0,0,0,0,0,0,0]));
 assert.throws(()=>validateFontFile('invalida.ttf',new TextEncoder().encode('MZ1234567890')));
 assert.throws(()=>validateFontFile('grande.ttf',new Uint8Array(10*1024*1024+1)));
 assert.throws(()=>validateFontFile('curta.ttf',new Uint8Array(4)));
});
