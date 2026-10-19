import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync,sign} from 'node:crypto';
import {RADIAL,COMPACT,PICKER,WORKSPACE,orient,sector,circle,pickerPage,moveSelection} from '../src/radial-model.mjs';
import {parsePlugin,verifyPlugin} from '../src/plugin-model.mjs';
const layout=JSON.parse(readFileSync(new URL('../plugins/menu-circular/plugin.json',import.meta.url),'utf8'));
test('radial window regions stay inside their window at every page size',()=>{
 for(const geometry of [RADIAL,COMPACT,PICKER])for(const [x,y] of circle(geometry)){assert.ok(x>=0&&x<=geometry.width);assert.ok(y>=0&&y<=geometry.height);}
 for(let count=1;count<=5;count++)for(let index=0;index<count;index++)for(const [x,y] of sector(index,count).points){assert.ok(Number.isFinite(x)&&Number.isFinite(y));assert.ok(x>=0&&x<=RADIAL.width);assert.ok(y>=0&&y<=RADIAL.height);}
});
test('circular picker paginates without dropping options and wraps navigation',()=>{
 const covered=new Set();for(let i=0;i<23;i++){const p=pickerPage(23,i);assert.ok(i>=p.start&&i<p.end);for(let j=p.start;j<p.end;j++)covered.add(j);}assert.equal(covered.size,23);
 assert.equal(moveSelection(0,23,'ArrowUp'),22);assert.equal(moveSelection(22,23,'ArrowRight'),0);assert.equal(moveSelection(9,23,'Home'),0);assert.equal(moveSelection(0,23,'End'),22);assert.equal(moveSelection(0,23,'PageDown'),5);
});
test('layout has no project access and rejects injected colors or extra permissions',()=>{
 assert.equal(parsePlugin(layout).id,'menu-circular');
 assert.throws(()=>parsePlugin({...layout,permissions:['project.write']}));assert.throws(()=>parsePlugin({...layout,palette:{...layout.palette,paper:'url(https://example.com)'}}));
 assert.throws(()=>parsePlugin({...layout,slots:[...layout.slots.slice(0,4),layout.slots[0]]}));
});
test('browser plugin installation verifies its signed payload before use',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ed25519'),payload=Buffer.from(JSON.stringify(layout)),key=publicKey.export({format:'der',type:'spki'}).subarray(-32).toString('hex');
 const envelope={payload:payload.toString('hex'),signature:sign(null,payload,privateKey).toString('hex')};assert.equal((await verifyPlugin(envelope,key)).name,layout.name);
 const corrupt={...envelope,payload:Buffer.from(JSON.stringify({...layout,name:'Forged'})).toString('hex')};await assert.rejects(()=>verifyPlugin(corrupt,key));
});

// Native regions must include the reveal motion and work at either screen edge.
test('expanded destinations and mirrored fans remain within native window regions',()=>{
 for(const original of [RADIAL,PICKER,WORKSPACE])for(const left of [false,true]){
  const geometry=orient(original,left);
  for(const point of circle(geometry))assert.ok(point[0]>=0&&point[0]<=geometry.width&&point[1]>=0&&point[1]<=geometry.height);
  for(let count=1;count<=5;count++)for(let i=0;i<count;i++){
   const normal=sector(i,count,geometry),motion=sector(i,count,{...geometry,inner:geometry.inner*.92,outer:geometry.outer+2});
   for(const [x,y] of [...normal.points,...motion.points])assert.ok(x>=0&&x<=geometry.width&&y>=0&&y<=geometry.height);
   const twin=sector(i,count,orient(original,!left)).label;
   assert.ok(Math.abs(normal.label[0]+twin[0]-geometry.width)<1e-8);
   assert.ok(Math.abs(normal.label[1]-twin[1])<1e-8);
  }
 }
});

test('main fan meets the central axis with narrow consistent gaps',()=>{
 const first=sector(0,5),last=sector(4,5);
 assert.ok(Math.abs(first.points[0][0]-RADIAL.cx)<3);
 assert.ok(Math.abs(last.points[28][0]-RADIAL.cx)<3);
 assert.ok(RADIAL.inner-RADIAL.hub<=6);
 for(let i=0;i<4;i++){
  const a=sector(i,5).points[28],b=sector(i+1,5).points[0];
  assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<5);
 }
});

test('hover open and close keep the native window and hub stationary',()=>{
 for(const left of [false,true]){
  const expanded=orient(RADIAL,left),compact=orient(COMPACT,left);
  for(const property of ['width','height','cx','cy','hub'])assert.equal(compact[property],expanded[property]);
  assert.deepEqual(circle(compact),circle(expanded));
 }
});
