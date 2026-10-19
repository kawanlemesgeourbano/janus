// Original synthesized cues: no recordings, external samples or audio downloads.
let context:AudioContext|undefined,pending='',installed=false,lastTime=-1000;
const melodies:Record<string,number[]>={curious:[523,622,587],wave:[392,494,659,784],expand:[392,494],fold:[494,392],navigate:[587],project:[440,554,659],plugin:[523,659,784],radialOpen:[480,640],radialClose:[580,430],greet:[392,523,659],finish:[523,784],response:[523,659,784,1047],connected:[392,523,659,784],toggle:[660,880],pin:[740,988],unpin:[740,554],clear:[587,440],love:[659,784,988],slap:[220,165],dizzy:[440,370,311],annoyed:[294,262],open:[392,523],send:[659,880],question:[440,587],error:[220,196],close:[523,392]};
export const Sound={
 enabled:true,
 setup(){if(installed)return;installed=true;const activate=()=>void this.unlock();window.addEventListener('pointerdown',activate,{capture:true,passive:true});window.addEventListener('keydown',activate,{capture:true});},
 async unlock(){if(!this.enabled)return;try{context??=new AudioContext();if(context.state!=='running')await context.resume();if(context.state==='running'&&pending){const cue=pending;pending='';this.play(cue);}}catch{/* No sound device or autoplay blocked; retry on the next interaction. */}},
 play(name:string){
  if(!this.enabled||!melodies[name])return;
  try{context??=new AudioContext();if(context.state!=='running'){pending=name;void this.unlock();return;}
   const now=performance.now();if(now-lastTime<65)return;lastTime=now;
   const start=context.currentTime,notes=melodies[name],soft=['navigate','toggle','pin','unpin'].includes(name);
   notes.forEach((frequency,index)=>{const time=start+index*.075,duration=soft?.14:.22;
    // A quiet harmonic gives each short cue a rounded bell timbre.
    for(const [ratio,level,type] of [[1,.085,'sine'],[2,.014,'triangle']] as [number,number,OscillatorType][]){
     const oscillator=context!.createOscillator(),gain=context!.createGain();oscillator.type=type;
     oscillator.frequency.setValueAtTime(frequency*ratio*(name==='send'?.92:1),time);oscillator.frequency.exponentialRampToValueAtTime(frequency*ratio,time+.045);
     gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level/(1+index*.08),time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
     oscillator.connect(gain);gain.connect(context!.destination);oscillator.start(time);oscillator.stop(time+duration+.01);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    }
   });
  }catch{/* Audio remains optional when an output device is unavailable. */}
 }
};
