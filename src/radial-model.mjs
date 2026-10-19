export const RADIAL={width:450,height:560,cx:310,cy:280,hub:128,inner:134,outer:260};
export const WORKSPACE={width:500,height:540,cx:250,cy:270,hub:238,inner:236,outer:238};
export const COMPACT={width:272,height:288,cx:136,cy:144,hub:128,inner:132,outer:258};
export const PICKER={width:550,height:560,cx:405,cy:280,hub:138,inner:150,outer:258};
export const PAGE_SIZE=5;
const point=(cx,cy,r,degrees)=>[cx+r*Math.cos(degrees*Math.PI/180),cy+r*Math.sin(degrees*Math.PI/180)];
export function sector(index,count,geometry=RADIAL){
 if(!Number.isInteger(count)||count<1||count>5||index<0||index>=count)throw Error('Invalid radial sector');
 const {cx,cy,inner,outer}=geometry,left=geometry.side!=='right',start=left?-90-index*180/count-.45:-90+index*180/count+.45,end=left?-90-(index+1)*180/count+.45:-90+(index+1)*180/count-.45;
 const points=[];for(let i=0;i<=28;i++)points.push(point(cx,cy,outer,start+(end-start)*i/28));
 for(let i=0;i<=28;i++)points.push(point(cx,cy,inner,end+(start-end)*i/28));
 const rounded=points.map((p,i)=>{const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length],a=Math.hypot(p[0]-prev[0],p[1]-prev[1]),b=Math.hypot(next[0]-p[0],next[1]-p[1]),r=Math.min(9,a/2,b/2);return {p,before:[p[0]+(prev[0]-p[0])*r/a,p[1]+(prev[1]-p[1])*r/a],after:[p[0]+(next[0]-p[0])*r/b,p[1]+(next[1]-p[1])*r/b]};});
 const xy=p=>p.map(n=>n.toFixed(2)).join(' ');
 const path='M '+xy(rounded[0].before)+' '+rounded.map(p=>'L '+xy(p.before)+' Q '+xy(p.p)+' '+xy(p.after)).join(' ')+' Z';
 return {points,path,label:point(cx,cy,(inner+outer)/2,(start+end)/2)};
}
export function circle(geometry=RADIAL){return Array.from({length:128},(_,i)=>point(geometry.cx,geometry.cy,geometry.hub+4,i*360/128));}
export function pickerPage(length,index){if(!length)return {start:0,end:0,page:0,pages:0};const safe=Math.max(0,Math.min(length-1,index)),start=Math.floor(safe/PAGE_SIZE)*PAGE_SIZE;return {start,end:Math.min(length,start+PAGE_SIZE),page:Math.floor(safe/PAGE_SIZE),pages:Math.ceil(length/PAGE_SIZE)};}
export function moveSelection(index,length,key){if(!length)return 0;if(key==='Home')return 0;if(key==='End')return length-1;const delta=['ArrowUp','ArrowLeft'].includes(key)?-1:['ArrowDown','ArrowRight'].includes(key)?1:key==='PageUp'?-PAGE_SIZE:key==='PageDown'?PAGE_SIZE:0;return (index+delta%length+length)%length;}
export function brief(text){const words=String(text).trim().split(/\s+/);return words.slice(0,6).join(' ')+(words.length>6?'…':'');}

export function orient(geometry,left=false){return {...geometry,cx:left?geometry.width-geometry.cx:geometry.cx,side:left?"right":"left"};}
