import {test} from 'node:test';
import assert from 'node:assert/strict';
import {welcomeKey,welcomeText,firstNames,dragSurface} from '../src/interaction-model.mjs';
test('automatic welcome is scoped by provider, model, first names and local hour',()=>{
 const c={provider:'compatible',baseUrl:'https://example.com/v1',model:'test'};const date=new Date(2026,9,18,7,10);
 assert.equal(firstNames('  Ana  Maria Silva '),'Ana Maria');assert.equal(welcomeKey(c,'Ana Maria Silva',date),welcomeKey(c,'Ana Maria Souza',new Date(2026,9,18,7,59)));assert.notEqual(welcomeKey(c,'Ana Maria',date),welcomeKey(c,'Ana Maria',new Date(2026,9,18,8,0)));assert.notEqual(welcomeKey(c,'Ana Maria',date),welcomeKey({...c,model:'other'},'Ana Maria',date));
});
test('welcome text is plain and short; invalid model output keeps local fallback',()=>{assert.equal(welcomeText('“Uma manhã leve para você!”'),'Uma manhã leve para você!');assert.equal(welcomeText('x'.repeat(181)),'');assert.equal(welcomeText('\n\n'),'');assert.equal(welcomeText('/ madrugada). * No Olá? Yes.'),'');});
test('free dragging preserves controls and scrollbars, including settings header',()=>{
 assert.ok(dragSurface({heading:true,interactive:false,scrollbar:false,blank:false}));assert.ok(dragSurface({heading:false,interactive:false,scrollbar:false,blank:true}));assert.equal(dragSurface({heading:true,interactive:true,scrollbar:false,blank:true}),false);assert.equal(dragSurface({heading:false,interactive:false,scrollbar:true,blank:true}),false);assert.equal(dragSurface({heading:false,interactive:false,scrollbar:false,blank:false}),false);
});
