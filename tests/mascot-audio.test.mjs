import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function moduleAt(path,globals){const exports={};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,...globals});return exports;}
test('audio recovers from autoplay blocking without a retry loop and respects mute',async()=>{
 let running=false,resumes=0,tones=0,time=1000;const listeners=new Map();
 const parameter={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
 class Context{get state(){return running?'running':'suspended'}currentTime=0;destination={};async resume(){resumes++;}createOscillator(){tones++;return {frequency:parameter,connect(){},start(){},stop(){},disconnect(){}}}createGain(){return {gain:parameter,connect(){},disconnect(){}}}}
 const {Sound}=moduleAt('../src/core/sound.ts',{AudioContext:Context,performance:{now:()=>time},window:{addEventListener:(name,handler)=>listeners.set(name,handler)}});
 Sound.setup();Sound.setup();assert.equal(listeners.size,2);Sound.play('wave');await Promise.resolve();await Promise.resolve();assert.equal(resumes,1);assert.equal(tones,0);
 running=true;await listeners.get('pointerdown')();await Promise.resolve();assert.equal(tones,8);
 time+=100;Sound.enabled=false;Sound.play('response');assert.equal(tones,8);
 Sound.enabled=true;Sound.play('response');assert.equal(tones,16);
});
test('assistant activities render finite geometry and honor reduced motion',()=>{
 let reduced=false;const {BotEngine}=moduleAt('../src/avatar.ts',{matchMedia:()=>({matches:reduced})});const engine=new BotEngine();const calls=[];
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get(target,key){return key in target?target[key]:(...args)=>{for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v));calls.push([key,...args]);};}});
 for(const activity of ['idle','listening','thinking']){engine.setActivity(activity);engine.update(.1);engine.draw(context,160,160);}
 for(const reaction of ['respond','concerned','wink','wave','celebrate']){engine.triggerEmote(reaction);engine.draw(context,160,160);}
 reduced=true;engine.update(5);engine.setActivity('thinking');calls.length=0;engine.draw(context,160,160);const before=JSON.stringify(calls);engine.update(1);calls.length=0;engine.draw(context,160,160);assert.equal(JSON.stringify(calls),before);
});
