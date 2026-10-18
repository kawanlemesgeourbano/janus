import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findGuidanceNote,projectLabel} from '../src/project-ui.mjs';
test('guidance survives numbering, accents, whitespace and imported heading punctuation',()=>{
 const notes={'area do lote':'Orientação local','impossivel identificacao de pavimento':'Selecionar ID'};
 assert.equal(findGuidanceNote(notes,'1.  ÁREA DO LOTE '),'Orientação local');
 assert.equal(findGuidanceNote(notes,'IMPOSSÍVEL IDENTIFICAÇÃO DE PAVIMENTO'),'Selecionar ID');
 assert.equal(findGuidanceNote({},'ÁREA DO LOTE'),'');
 assert.equal(findGuidanceNote(notes,'BASE CARTOGRÁFICA'),'');
});
test('project display removes legacy contract suffix without changing its identity',()=>{
 assert.equal(projectLabel('Projeto Alfa · GO · contrato 2026'),'Projeto Alfa · GO');
 assert.equal(projectLabel('Projeto Beta · GO'),'Projeto Beta · GO');
});
