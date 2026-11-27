import { captionLayout, FILM_WIDTH, type CaptionPosition } from "../../supabase/functions/keep-render/composition";

/** Identical relative typography and positioning at every preview size and
 * at the final portrait render size. Controls are outside this composition. */
export function KeepFilmCaption({text, style, position="bottom", lines=2, captionSize=100}: {
  text:string; style:string; position?:CaptionPosition|undefined; lines?:number|undefined; captionSize?:number|undefined;
}) {
  if (!text || style === "None") return null;
  const layout = captionLayout(style, position, lines, captionSize);
  return <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center"
    style={{width: layout.width*100+"%", top: layout.top*100+"%", transform: layout.align==="bottom"?"translateY(-100%)":layout.align==="middle"?"translateY(-50%)":undefined}}>
    <p className="keep-caption-visible" style={{
      fontFamily:layout.font === "Playfair Display" ? "var(--font-display)" : "var(--font-sans)",
      fontSize:layout.fontSize/FILM_WIDTH*100+"cqw", fontWeight:layout.weight,
      fontStyle:layout.italic?"italic":"normal", lineHeight:layout.lineHeight,
      letterSpacing:layout.letterSpacing/FILM_WIDTH*100+"cqw", textTransform:layout.textTransform,
      color:layout.color, whiteSpace:"pre-line", margin:0,
      textShadow:"0 .28cqw 1.1cqw rgba(0,0,0,.98)",
    }}>{text}</p>
  </div>;
}
