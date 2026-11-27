import { filmCardLayout, FILM_WIDTH, FILM_HEIGHT } from "../../supabase/functions/keep-render/composition";

export function KeepFilmCard({mode,name,message,sender="",visible=true}:{
  mode:"opening"|"closing"; name:string; message:string; sender?:string; visible?:boolean;
}) {
  const elements=filmCardLayout(mode,name,message,sender);
  return <div className="absolute inset-0 pointer-events-none" style={{opacity:visible?1:0,transition:mode==="opening"?"opacity 1200ms ease-out":"opacity 1350ms ease-out 1000ms"}}>
    {elements.map((e,i)=><div key={i} className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center text-center"
      style={{top:e.top/FILM_HEIGHT*100+"%",width:e.width/FILM_WIDTH*100+"%",height:e.height/FILM_HEIGHT*100+"%",
        color:e.color,background:e.type==="line"?e.color:undefined,
        fontFamily:e.font==="sans"?'var(--font-sans)':'var(--font-display)',
        fontSize:e.size?e.size/FILM_WIDTH*100+"cqw":undefined,fontWeight:e.weight,
        fontStyle:e.font==="italic"?"italic":"normal",letterSpacing:e.letterSpacing?e.letterSpacing/FILM_WIDTH*100+"cqw":undefined,
        lineHeight:e.lineHeight,whiteSpace:"pre-line",overflowWrap:"anywhere"}}>
      {e.text}
    </div>)}
  </div>;
}
