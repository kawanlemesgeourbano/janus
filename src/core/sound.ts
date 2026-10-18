// Original procedural audio. No recordings or external samples.
let context:AudioContext|undefined;
const melodies:Record<string,number[]>={greet:[392,523,659],finish:[523,784],love:[659,784,988],slap:[220,165],dizzy:[440,370,311],annoyed:[294,262],open:[392,523],send:[659,880],question:[440,587],error:[220,196],close:[523,392]};
export const Sound={enabled:true,play(name:string){
 if(!this.enabled||!melodies[name])return;
 try{context??=new AudioContext();if(context.state!=='running'){void context.resume().then(()=>{if(context?.state==='running'&&this.enabled)this.play(name);}).catch(()=>{});return;}
  const start=context.currentTime;
  melodies[name].forEach((frequency,index)=>{const oscillator=context!.createOscillator(),gain=context!.createGain(),time=start+index*.085;
   oscillator.type='sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.035,time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+.13);
   oscillator.connect(gain);gain.connect(context!.destination);oscillator.start(time);oscillator.stop(time+.14);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  });
 }catch{/* Audio is optional when no output device is available. */}
}};
