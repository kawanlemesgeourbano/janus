// Original Janus compass character, drawn without external artwork.
export class BotEngine {
 lookX=0;lookY=0;private time=0;private reaction=0;private expression='';
 update(dt:number){this.time+=Math.min(dt,.1);this.reaction=Math.max(0,this.reaction-dt);}
 triggerEmote(name:string){this.expression=name;this.reaction=1.3;}
 greet(){this.triggerEmote('happy');}slap(){this.triggerEmote('surprised');}
 draw(ctx:CanvasRenderingContext2D,width:number,height:number){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,t=this.time;
  ctx.save();ctx.scale(Math.min(width,height)/160,Math.min(width,height)/160);ctx.translate(80,80+(reduced?0:Math.sin(t*1.8)*3));
  const x=Math.max(-1,Math.min(1,this.lookX))*7,y=Math.max(-1,Math.min(1,this.lookY))*6;
  ctx.fillStyle='rgba(22,51,78,.12)';ctx.beginPath();ctx.ellipse(0,53,35,5,0,0,Math.PI*2);ctx.fill();ctx.rotate(reduced?0:Math.sin(t*.9)*.035);
  const g=ctx.createLinearGradient(-45,-45,45,45);g.addColorStop(0,'#426d92');g.addColorStop(1,'#123d61');ctx.fillStyle=g;ctx.strokeStyle='#294c6b';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(0,-55);ctx.lineTo(50,-15);ctx.quadraticCurveTo(60,0,49,25);ctx.lineTo(0,51);ctx.lineTo(-49,25);ctx.quadraticCurveTo(-60,0,-50,-15);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#9fdedc';ctx.beginPath();ctx.moveTo(0,-44);ctx.lineTo(9,-32);ctx.lineTo(0,-25);ctx.lineTo(-9,-32);ctx.closePath();ctx.fill();
  ctx.fillStyle='#082f49';ctx.beginPath();ctx.roundRect(-39,-19,78,45,16);ctx.fill();
  const happy=this.reaction>0&&['happy','love'].includes(this.expression),blink=!reduced&&Math.sin(t*1.3)>.995;
  ctx.strokeStyle='#bdeee8';ctx.fillStyle='#bdeee8';ctx.lineWidth=4;ctx.lineCap='round';
  for(const offset of [-17,17]){if(happy){ctx.beginPath();ctx.arc(offset+x,5+y,7,Math.PI,Math.PI*2);ctx.stroke();}else{ctx.beginPath();ctx.roundRect(offset-4+x,-8+y,8,blink?2:17,4);ctx.fill();}}
  ctx.strokeStyle='#8bc6d0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,11+y,5,0,Math.PI);ctx.stroke();
  ctx.restore();
 }
}
