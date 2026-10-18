import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeProjects,validProject,parameterLabel} from '../src/project-ui.mjs';
const built={id:'projeto-teste',name:'Projeto de teste',source:'Original',items:[{key:'a',category:'Área',text:'Texto original'}]};
test('an edited built-in project replaces the original by identity and survives JSON persistence',()=>{
 const edit={...built,name:'Meu projeto',items:[{key:'a',category:'Área',text:'Texto editado'}],guidance:{parameters:[{title:'Novo',text:'5 m²'}],notes:{area:'Selecionar ID'}}};
 const saved=JSON.parse(JSON.stringify([edit,{...built,id:'pessoal'}]));
 assert.ok(saved.every(validProject));const result=mergeProjects([built],saved);
 assert.equal(result.length,2);assert.equal(result[0].id,'projeto-teste');assert.equal(result[0].name,'Meu projeto');assert.equal(result[0].guidance.notes.area,'Selecionar ID');assert.equal(built.items[0].text,'Texto original');
});
test('project validation rejects malformed imported guidance while accepting legacy projects',()=>{
 assert.ok(validProject(built));assert.equal(validProject({...built,guidance:{parameters:[],notes:{area:42}}}),false);assert.equal(validProject({...built,guidance:{parameters:[{title:'x',text:{}}],notes:{}}}),false);assert.equal(validProject({...built,documentText:'x'.repeat(500001)}),false);
});
test('parameter labels are readable without changing the official stored headings',()=>{
 assert.equal(parameterLabel('ELEMENTOS A SEREM CONSIDERADOS COMO ÁREA CONSTRUÍDA'),'Área construída: o que considerar');assert.equal(parameterLabel('CRITÉRIOS PARA O VÍNCULO'),'Critérios para o vínculo');
});
