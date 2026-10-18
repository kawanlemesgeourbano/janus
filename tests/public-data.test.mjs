import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fillTemplate,filterCatalog} from '../src/model.mjs';
import {mergeProjects} from '../src/project-ui.mjs';
test('public distribution contains no built-in projects or criteria',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../src/catalog.json',import.meta.url),'utf8'));
 assert.deepEqual(catalog,[]);assert.deepEqual(mergeProjects(catalog,[]),[]);
 const local={id:'synthetic',name:'Projeto de teste',source:'Fixture fictícia',items:[]};
 assert.deepEqual(mergeProjects(catalog,[local]),[local]);assert.deepEqual(catalog,[]);
});
test('template validation and search use synthetic fixtures',()=>{
 assert.equal(fillTemplate('Exemplo {X} m²',{X:' 0,01 '}),'Exemplo 0,01 m²');
 for(const value of ['', '0','-1','12.50','NaN','{X}'])assert.throws(()=>fillTemplate('Exemplo {X}',{X:value}));
 const items=[{key:'a',category:'Teste',text:'Exemplo de verificação'},{key:'b',category:'Outra',text:'Segundo exemplo'}];
 assert.equal(filterCatalog(items,'verificacao','',[],false).length,1);assert.equal(filterCatalog(items,'','Teste',[],false).length,1);
});
