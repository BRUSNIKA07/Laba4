import { computed, ref } from 'vue';
const W=1070,H=530;
export function useBunkerCamera(onSelect:(id:string)=>void) {
  const svg=ref<SVGSVGElement|null>(null), zoom=ref(1), x=ref(0),y=ref(0),dragging=ref(false);
  const viewBox=computed(()=>`${x.value} ${y.value} ${W/zoom.value} ${H/zoom.value}`);
  let gesture:{id:number;startX:number;startY:number;prevX:number;prevY:number;room?:string}|null=null;
  function clamp(){x.value=Math.max(0,Math.min(W-W/zoom.value,x.value));y.value=Math.max(0,Math.min(H-H/zoom.value,y.value));}
  function point(cx:number,cy:number){const el=svg.value; const m=el?.getScreenCTM();return m?new DOMPoint(cx,cy).matrixTransform(m.inverse()):null;}
  function wheel(e:WheelEvent){const p=point(e.clientX,e.clientY); if(!p)return;const old=zoom.value;const next=Math.max(1,Math.min(3.5,old*Math.exp(-e.deltaY*.0015)));if(next===old)return;x.value=p.x-(p.x-x.value)*old/next;y.value=p.y-(p.y-y.value)*old/next;zoom.value=next;clamp();}
  function down(e:PointerEvent){if(e.button!==0||!svg.value)return; const room=(e.target as Element).closest('[data-room]')?.getAttribute('data-room')??undefined;gesture={id:e.pointerId,startX:e.clientX,startY:e.clientY,prevX:e.clientX,prevY:e.clientY,room};svg.value.setPointerCapture(e.pointerId);}
  function move(e:PointerEvent){if(!gesture||gesture.id!==e.pointerId)return;if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>4)dragging.value=true;if(dragging.value){const a=point(gesture.prevX,gesture.prevY),b=point(e.clientX,e.clientY);if(a&&b){x.value+=a.x-b.x;y.value+=a.y-b.y;clamp();}}gesture.prevX=e.clientX;gesture.prevY=e.clientY;}
  function up(e:PointerEvent){if(!gesture||gesture.id!==e.pointerId)return;if(e.type==='pointerup'&&!dragging.value&&gesture.room)onSelect(gesture.room);gesture=null;dragging.value=false;}
  function reset(){zoom.value=1;x.value=0;y.value=0;}
  return {svg,zoom,viewBox,dragging,wheel,down,move,up,reset};
}
