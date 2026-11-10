export function readAnimatedValue(element, property, time, fallback) {
  const frames = (element.keyframes || []).filter(frame => Number.isFinite(frame.time) && Number.isFinite(frame[property])).slice().sort((a,b)=>a.time-b.time);
  if (!frames.length) return fallback;
  if (time <= frames[0].time) return frames[0][property];
  if (time >= frames[frames.length-1].time) return frames[frames.length-1][property];
  const index=frames.findIndex(frame=>frame.time>=time), left=frames[index-1], right=frames[index];
  const p=Math.max(0,Math.min(1,(time-left.time)/Math.max(.0001,right.time-left.time)));
  const easing=right.easing||'linear';
  const q=easing==='ease-in'?p*p:easing==='ease-out'?1-(1-p)*(1-p):easing==='ease-in-out'?(p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2):p;
  return left[property]+(right[property]-left[property])*q;
}
export function upsertKeyframe(element,time){
 const t=Math.max(0,Math.round(time*100)/100);
 const frame={time:t,x:Number(element.x)||0,y:Number(element.y)||0,scale:Number(element.scale??1),opacity:Number(element.opacity??1),rotation:Number(element.rotation??0),easing:'ease-in-out'};
 const frames=(element.keyframes||[]).filter(k=>Math.abs(k.time-t)>.001);frames.push(frame);frames.sort((a,b)=>a.time-b.time);return frames;
}
