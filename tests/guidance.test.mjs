import test from 'node:test';
import assert from 'node:assert/strict';
import {parseGuidance,parameterTitles} from '../src/guidance.mjs';
test('new city imports retain warnings and instructions without mixing category descriptions',()=>{
 const doc=parseGuidance(['ELEMENTOS A SEREM CONSIDERADOS COMO ÁREA CONSTRUÍDA\n• Exemplo fictício A\nELEMENTOS A NÃO SEREM CONSIDERADOS COMO ÁREA\nCONSTRUÍDA\n• Exemplo fictício B\nPARÂMETROS PARA O VÍNCULO\n• Exemplo fictício C.\nPARÂMETROS PARA AS DIVERGÊNCIAS\n1. TESTE ALFA\nTexto fictício para teste.\nATENÇÃO: Aviso fictício.\n No vincular cadastro\n- Ação fictícia A\n2. TESTE BETA\nTexto de outro teste.\n No vincular cadastro\n- Ação fictícia B']);
 assert.deepEqual(doc.parameters.map(p=>p.title),parameterTitles);
 assert.match(doc.parameters[0].text,/fictício A/);assert.doesNotMatch(doc.parameters[0].text,/fictício B/);
 assert.match(doc.notes['teste alfa'],/Ação fictícia A/);assert.doesNotMatch(doc.notes['teste alfa'],/Ação fictícia B/);
 assert.equal(doc.notes['teste beta'],'• No vincular cadastro\n- Ação fictícia B');
 const empty=parseGuidance([]);assert.ok(empty.parameters.every(p=>!p.text));assert.deepEqual(empty.notes,{});
});
