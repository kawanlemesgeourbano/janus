// Original Janus compass character, drawn without external artwork.
export class BotEngine {
 lookX=0;lookY=0;private time=0;private reaction=0;private expression='';private activity:'idle'|'listening'|'thinking'='idle';
 update(dt:number){this.time+=Math.min(dt,.1);this.reaction=Math.max(0,this.reaction-dt);}
 triggerEmote(name:string){this.expression=name;this.reaction=name==='respond'?2.4:1.3;}
 setActivity(activity:'idle'|'listening'|'thinking'){this.activity=activity;}
 greet(){this.triggerEmote('wave');this.reaction=2.4;}slap(){this.triggerEmote('surprised');}
 draw(ctx:CanvasRenderingContext2D,width:number,height:number){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,t=this.time;
  ctx.save();ctx.scale(Math.min(width,height)/160,Math.min(width,height)/160);ctx.translate(80,80+(reduced?0:Math.sin(t*1.8)*3));
  const thinking=this.activity==='thinking',listening=this.activity==='listening',responding=this.reaction>0&&this.expression==='respond';
  const x=Math.max(-1,Math.min(1,this.lookX))*7,y=Math.max(-1,Math.min(1,this.lookY))*6;
  if(thinking||listening||responding){ctx.save();ctx.strokeStyle=thinking?'#76b7cf88':'#83d7d377';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,62+(reduced?0:Math.sin(t*3)*2),59,0,0,Math.PI*2);ctx.stroke();if(thinking)for(let i=0;i<3;i++){const a=(reduced?-.9:t*1.4)+i*.55;ctx.fillStyle='#a3e5e4';ctx.beginPath();ctx.arc(Math.cos(a)*62,Math.sin(a)*59,3,0,Math.PI*2);ctx.fill();}ctx.restore();}
  ctx.fillStyle='rgba(22,51,78,.12)';ctx.beginPath();ctx.ellipse(0,53,35,5,0,0,Math.PI*2);ctx.fill();ctx.rotate(reduced?0:thinking?Math.sin(t*2)*.075:listening?Math.sin(t*2.7)*.045:Math.sin(t*.9)*.035);
  const g=ctx.createLinearGradient(-45,-45,45,45);g.addColorStop(0,'#426d92');g.addColorStop(1,'#123d61');ctx.fillStyle=g;ctx.strokeStyle='#294c6b';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(0,-55);ctx.lineTo(50,-15);ctx.quadraticCurveTo(60,0,49,25);ctx.lineTo(0,51);ctx.lineTo(-49,25);ctx.quadraticCurveTo(-60,0,-50,-15);ctx.closePath();ctx.fill();ctx.stroke();
  if(this.reaction>0&&!reduced&&this.expression==='wave'){ctx.save();ctx.translate(51,-3);ctx.rotate(Math.sin(t*16)*.35);ctx.strokeStyle='#75b3c9';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,15);ctx.lineTo(12,-6);ctx.stroke();ctx.fillStyle='#bdeee8';ctx.beginPath();ctx.ellipse(12,-12,7,10,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(this.reaction>0&&this.expression==='wave'){ctx.fillStyle='#d0eeec';ctx.beginPath();ctx.roundRect(-64,-65,38,23,8);ctx.fill();ctx.fillStyle='#234f70';ctx.font='bold 14px Segoe UI';ctx.textAlign='center';ctx.fillText('Oi!',-45,-49);}
  ctx.fillStyle='#9fdedc';ctx.beginPath();ctx.moveTo(0,-44);ctx.lineTo(9,-32);ctx.lineTo(0,-25);ctx.lineTo(-9,-32);ctx.closePath();ctx.fill();
  ctx.fillStyle='#082f49';ctx.beginPath();ctx.roundRect(-39,-19,78,45,16);ctx.fill();
  const curious=thinking||this.reaction>0&&['curious','thinking'].includes(this.expression),surprise=this.reaction>0&&this.expression==='surprised';
  if(curious&&!thinking){ctx.save();ctx.fillStyle='#d3eff0';ctx.font='bold 29px Segoe UI';ctx.textAlign='center';ctx.fillText('?',39,-35+(reduced?0:Math.sin(t*4)*2));ctx.restore();}
  if(this.reaction>0&&this.expression==='celebrate'){for(let i=0;i<6;i++){const angle=i*Math.PI/3+(reduced?0:t);ctx.fillStyle=i%2?'#88d4ce':'#c4eaf0';ctx.beginPath();ctx.arc(Math.cos(angle)*61,Math.sin(angle)*48,2.5,0,Math.PI*2);ctx.fill();}}
  if(thinking){ctx.fillStyle='#d0eeec';ctx.beginPath();ctx.roundRect(16,-65,48,22,9);ctx.fill();for(let i=0;i<3;i++){ctx.fillStyle='#315f7b';ctx.beginPath();ctx.arc(27+i*12,-54+(reduced?0:Math.sin(t*5-i*.8)*2),2.4,0,Math.PI*2);ctx.fill();}}
  if(responding){ctx.strokeStyle='#a9e4e4';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(47,-8,10+i*5,-.6,.6);ctx.stroke();}}
  const happy=this.reaction>0&&['happy','love','wave','celebrate','respond'].includes(this.expression),blink=!reduced&&Math.sin(t*1.3)>.995;
  ctx.strokeStyle='#bdeee8';ctx.fillStyle='#bdeee8';ctx.lineWidth=4;ctx.lineCap='round';
  for(const offset of [-17,17]){if(this.reaction>0&&this.expression==='wink'&&offset>0){ctx.beginPath();ctx.moveTo(offset-6+x,3+y);ctx.lineTo(offset+6+x,3+y);ctx.stroke();}else if(happy){ctx.beginPath();ctx.arc(offset+x,5+y,7,Math.PI,Math.PI*2);ctx.stroke();}else{ctx.beginPath();ctx.roundRect(offset-4+x,-8+y,8,blink?2:surprise?22:curious?(offset<0?12:19):17,4);ctx.fill();}}
  ctx.strokeStyle='#8bc6d0';ctx.lineWidth=2;ctx.beginPath();if(this.reaction>0&&this.expression==='concerned'){ctx.arc(x,19+y,5,Math.PI,Math.PI*2);}else if(responding){ctx.ellipse(x,14+y,5,reduced?3:3+Math.sin(t*12)*1.5,0,0,Math.PI*2);}else{ctx.arc(x,11+y,5,0,Math.PI);}ctx.stroke();
  ctx.restore();
 }
}
