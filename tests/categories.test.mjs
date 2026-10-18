import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryGroups,categoryShortcut,canonicalShortcut} from '../src/categories.mjs';
test('shortcuts select categories, ten uses zero, eleven has none',()=>{
 const items=[{category:'Área',text:'A'},{category:'Área',text:'B'},{category:'Foto',text:'C'}];
 const groups=categoryGroups(items);
 assert.equal(groups.length,2);assert.equal(groups[0].items.length,2);
 assert.equal(groups[1].number,2);
 assert.equal(categoryShortcut(0),'Control+Shift+1');
 assert.equal(categoryShortcut(9),'Control+Shift+0');
 assert.equal(categoryShortcut(10),'');
 assert.equal(canonicalShortcut('Alt+Shift+1'),canonicalShortcut('Shift+Alt+1'));
});
