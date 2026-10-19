// Original Janus compass character, drawn without external artwork.
export class BotEngine {
 lookX=0;lookY=0;private time=0;private reaction=0;private expression='';
 update(dt:number){this.time+=Math.min(dt,.1);this.reaction=Math.max(0,this.reaction-dt);}
 triggerEmote(name:string){this.expression=name;this.reaction=1.3;}
 greet(){this.triggerEmote('wave');this.reaction=2.4;}slap(){this.triggerEmote('surprised');}
 draw(ctx:CanvasRenderingContext2D,width:number,height:number){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,t=this.time;
  ctx.save();ctx.scale(Math.min(width,height)/160,Math.min(width,height)/160);ctx.translate(80,80+(reduced?0:Math.sin(t*1.8)*3));
  const x=Math.max(-1,Math.min(1,this.lookX))*7,y=Math.max(-1,Math.min(1,this.lookY))*6;
  ctx.fillStyle='rgba(22,51,78,.12)';ctx.beginPath();ctx.ellipse(0,53,35,5,0,0,Math.PI*2);ctx.fill();ctx.rotate(reduced?0:Math.sin(t*.9)*.035);
  const g=ctx.createLinearGradient(-45,-45,45,45);g.addColorStop(0,'#426d92');g.addColorStop(1,'#123d61');ctx.fillStyle=g;ctx.strokeStyle='#294c6b';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(0,-55);ctx.lineTo(50,-15);ctx.quadraticCurveTo(60,0,49,25);ctx.lineTo(0,51);ctx.lineTo(-49,25);ctx.quadraticCurveTo(-60,0,-50,-15);ctx.closePath();ctx.fill();ctx.stroke();
  if(this.reaction>0&&!reduced&&this.expression==='wave'){ctx.save();ctx.translate(51,-3);ctx.rotate(Math.sin(t*16)*.35);ctx.strokeStyle='#75b3c9';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,15);ctx.lineTo(12,-6);ctx.stroke();ctx.fillStyle='#bdeee8';ctx.beginPath();ctx.ellipse(12,-12,7,10,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(this.reaction>0&&this.expression==='wave'){ctx.fillStyle='#d0eeec';ctx.beginPath();ctx.roundRect(-64,-65,38,23,8);ctx.fill();ctx.fillStyle='#234f70';ctx.font='bold 14px Segoe UI';ctx.textAlign='center';ctx.fillText('Oi!',-45,-49);}
  ctx.fillStyle='#9fdedc';ctx.beginPath();ctx.moveTo(0,-44);ctx.lineTo(9,-32);ctx.lineTo(0,-25);ctx.lineTo(-9,-32);ctx.closePath();ctx.fill();
  ctx.fillStyle='#082f49';ctx.beginPath();ctx.roundRect(-39,-19,78,45,16);ctx.fill();
  const curious=this.reaction>0&&['curious','thinking'].includes(this.expression),surprise=this.reaction>0&&this.expression==='surprised';
  if(curious){ctx.save();ctx.fillStyle='#d3eff0';ctx.font='bold 29px Segoe UI';ctx.textAlign='center';ctx.fillText('?',39,-35+(reduced?0:Math.sin(t*4)*2));ctx.restore();}
  if(this.reaction>0&&this.expression==='celebrate'){for(let i=0;i<6;i++){const angle=i*Math.PI/3+(reduced?0:t);ctx.fillStyle=i%2?'#88d4ce':'#c4eaf0';ctx.beginPath();ctx.arc(Math.cos(angle)*61,Math.sin(angle)*48,2.5,0,Math.PI*2);ctx.fill();}}
  const happy=this.reaction>0&&['happy','love','wave','celebrate'].includes(this.expression),blink=!reduced&&Math.sin(t*1.3)>.995;
  ctx.strokeStyle='#bdeee8';ctx.fillStyle='#bdeee8';ctx.lineWidth=4;ctx.lineCap='round';
  for(const offset of [-17,17]){if(happy){ctx.beginPath();ctx.arc(offset+x,5+y,7,Math.PI,Math.PI*2);ctx.stroke();}else{ctx.beginPath();ctx.roundRect(offset-4+x,-8+y,8,blink?2:surprise?22:curious?(offset<0?12:19):17,4);ctx.fill();}}
  ctx.strokeStyle='#8bc6d0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,11+y,5,0,Math.PI);ctx.stroke();
  ctx.restore();
 }
}
