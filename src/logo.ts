type Atlas={width:number;height:number;columns:number;durations:number[]};
export async function setupLogo(canvas:HTMLCanvasElement){
 const [data,img]=await Promise.all([fetch('./janus-logo-animation.json').then(r=>r.json()) as Promise<Atlas>,new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='./janus-logo-atlas.webp';})]);
 canvas.width=data.width;canvas.height=data.height;
 const ctx=canvas.getContext('2d')!;let raf=0;
 const ends=data.durations.map((_,i)=>data.durations.slice(0,i+1).reduce((a,b)=>a+b,0));
 function draw(n:number){canvas.dataset.frame=String(n);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,(n%data.columns)*data.width,Math.floor(n/data.columns)*data.height,data.width,data.height,0,0,data.width,data.height);}
 function play(){cancelAnimationFrame(raf);const start=performance.now();draw(0);const step=(now:number)=>{const elapsed=now-start;const n=ends.findIndex(end=>elapsed<end);if(n<0){draw(0);raf=0;return;}draw(n);raf=requestAnimationFrame(step);};raf=requestAnimationFrame(step);}
 canvas.addEventListener('click',play);
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)draw(0);else play();
}
