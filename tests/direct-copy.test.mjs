import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {directText} from '../src/model.mjs';
test('direct selection removes placeholders without changing supplied facts',()=>{
 const cities=[{items:[{text:'Exemplo fictício {X} m².'},{text:'Outro exemplo fictício.'}]}];
 for(const city of cities)for(const item of city.items){const text=directText(item.text);assert.ok(!/[{}]/.test(text));assert.ok(text.length>8);assert.equal(directText(text),text);}
 assert.equal(directText('Área reduzida {X} m², lote {A}.'),'Área reduzida m², lote.');
 assert.equal(directText('Lotes 001 e 002, 12,50 m².'),'Lotes 001 e 002, 12,50 m².');
});
