import test from 'node:test';
import assert from 'node:assert/strict';
import {greeting,defaultShortcut,shortcutFromEvent,parseDivergencePages} from '../src/import-model.mjs';
test('Windows display name uses two names and hourly messages',()=>{
 assert.equal(greeting('  Ana   Maria Silva ',7).title,'Bom dia, Ana Maria!');
 assert.match(greeting('',7).message,/cedo/);
 assert.equal(greeting('Ana Maria Silva',18).title,'Boa noite, Ana Maria!');
 assert.match(greeting('',12).title,/Boa tarde/);
 assert.match(greeting('',2).message,/pausa/);
});
test('both shortcut prefixes produce 68 unique canonical bindings',()=>{
 for(const prefix of ['Control+Shift','Alt+Shift']){
  const keys=Array.from({length:68},(_,i)=>defaultShortcut(i,prefix));
  assert.equal(new Set(keys).size,68);
  for(const key of keys)assert.equal(new Set(key.split('+')).size,key.split('+').length);
 }
 assert.equal(defaultShortcut(68),'');
 assert.equal(shortcutFromEvent({key:'a',code:'KeyA',ctrlKey:true,shiftKey:true,altKey:true}),'Control+Shift+Alt+A');
});
test('PDF descriptions survive warnings, wrap lines, and exclude operation instructions',()=>{
 const items=parseDivergencePages(['1 - TESTE ALFA\nÁrea fictícia 00,00 m² para teste do leitor.\nNo vincular:\nNão consta uma instrução para copiar.\n2 - TESTE BETA\nATENÇÃO: Aviso fictício.\nNunca executar automaticamente.\nPossível exemplo fictício para validar o leitor.\n3 - TESTE GAMA\nNa foto fictícia o texto continua na linha seguinte,\nsem definir qualquer critério real.']);
 assert.equal(items.length,3);
 assert.match(items[0].text,/\{X\}/);
 assert.match(items[1].text,/Possível exemplo fictício/);
 assert.match(items[2].text,/seguinte, sem definir/);
 assert.ok(items.every(i=>!i.text.includes('instrução')));
});
