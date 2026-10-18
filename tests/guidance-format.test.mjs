import test from 'node:test';
import assert from 'node:assert/strict';
import {guidanceTokens} from '../src/guidance-format.mjs';
test('criteria preserve numeric values, units, punctuation and zero padding',()=>{
 const text='QD 001: área de 1.250,50 m²; limite 10% e 5 m2. Unidade m².';
 const tokens=guidanceTokens(text);
 assert.equal(tokens.map(t=>t.text).join(''),text);
 assert.deepEqual(tokens.filter(t=>t.emphasis).map(t=>t.text),['001','1.250,50 m²','10%','5 m2','m²']);
});
test('untrusted document markup stays plain text during highlighting',()=>{
 const text='<img src=x onerror=alert(1)> Teto de vidro.';
 const tokens=guidanceTokens(text);
 assert.equal(tokens.map(t=>t.text).join(''),text);
 assert.deepEqual(tokens.filter(t=>t.emphasis).map(t=>t.text),['1']);
});
