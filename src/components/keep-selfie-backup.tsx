import { ArrowRight, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function KeepSelfieBackup({ open, momentCount, onClose, onVoice, onSelfie }: {
  open: boolean;
  momentCount: number;
  onClose: () => void;
  onVoice: () => void;
  onSelfie: () => void;
}) {
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="w-[calc(100%-32px)] max-w-[440px] gap-0 rounded-[22px] border-[#DAD0C5] bg-[#F7F5F2] p-6 text-[#171512]">
      <DialogTitle className="pr-6 font-display text-[34px] font-normal leading-[1.06] tracking-[-.025em]">A few moments are enough.</DialogTitle>
      <DialogDescription className="mt-4 text-[13px] leading-6 text-[#746E67]">
        {momentCount ? "You can make a beautiful Keep with the photos and videos you have." : "You can make a meaningful Keep even without photos or videos."}
        {" "}If you’d like more visual material, you can record your message with your front camera on, capturing your face and voice in the same take.
      </DialogDescription>
      <div className="mt-6 space-y-3">
        <button type="button" onClick={onVoice} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-[#171512] px-4 text-left text-sm font-medium text-white">
          {momentCount ? "Continue with my moments" : "Continue with voice only"} <ArrowRight className="size-5 shrink-0" aria-hidden="true"/>
        </button>
        <button type="button" onClick={onSelfie} className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-[#CDBBA9] bg-[#FFFCF8] px-4 text-left text-sm font-medium text-[#594637]">
          <Camera className="size-5 shrink-0" aria-hidden="true"/> Record my message on camera
        </button>
        <button type="button" onClick={onClose} className="min-h-10 w-full text-xs text-[#806B57] underline underline-offset-4">Back to photos &amp; videos</button>
      </div>
      <p className="mt-3 text-center text-[11px] leading-5 text-[#806B57]">Your message only needs to be recorded once, whichever you choose.</p>
    </DialogContent>
  </Dialog>;
}
