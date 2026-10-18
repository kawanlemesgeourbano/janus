import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shortMessage,welcomeText,pickerAction,agentLabel} from '../src/interaction-model.mjs';
import {greeting} from '../src/import-model.mjs';
test('release greetings always fit ten words, including cached AI phrases and all local hours',()=>{
 for(let h=0;h<24;h++)assert.ok(shortMessage(greeting('Ana Maria Silva',h).message).split(/\s+/).length<=10);
 const long='Que esta manhã traga boas ideias e um trabalho leve com muita tranquilidade para você.';
 assert.equal(shortMessage(long).split(/\s+/).length,10);assert.equal(welcomeText(long).split(/\s+/).length,10);assert.equal(shortMessage('  Tudo pronto.  '),'Tudo pronto.');
});
test('same category closes picker while another category switches it directly',()=>{
 assert.equal(pickerAction('','Área do lote'),'open');assert.equal(pickerAction('Área do lote','Área do lote'),'close');assert.equal(pickerAction('Área do lote','Redução de área'),'switch');
});
test('connected agent label names the provider or a custom model',()=>{
 assert.equal(agentLabel({provider:'gemini',model:'gemini-flash-latest'}),'Gemini');assert.equal(agentLabel({provider:'anthropic',model:'x'}),'Claude');assert.equal(agentLabel({provider:'openai',model:'x'}),'OpenAI');assert.equal(agentLabel({provider:'compatible',model:'meu-modelo'}),'meu-modelo');
});
