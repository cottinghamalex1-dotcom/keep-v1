import { useState, type FormEvent } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Download, Gift, Heart, LockKeyhole, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Props = {
  displayName: string; email: string;
  created: number; published: number; drafts: number; given: number; received: number;
  onSaveName: (name:string)=>Promise<void>;
  onChangePassword: (password:string)=>Promise<void>;
  onExport: ()=>void;
  onSignOut: ()=>void;
};
export function KeepAccountDashboard({displayName,email,created,published,drafts,given,received,onSaveName,onChangePassword,onExport,onSignOut}:Props) {
  const [name,setName] = useState(displayName);
  const [password,setPassword] = useState("");
  const [confirm,setConfirm] = useState("");
  const [editingPassword,setEditingPassword] = useState(false);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const card = "rounded-[20px] border border-[#DED7CE] bg-[#FFFEFC] p-5 sm:p-6";
  const saveName = async (event: FormEvent) => {
    event.preventDefault();setSaving(true);setError("");setMessage("");
    try {await onSaveName(name.trim());setMessage("Display name updated.");}
    catch(e){setError(e instanceof Error?e.message:"Your name couldn't be saved.");}
    finally{setSaving(false);}
  };
  const savePassword = async (event: FormEvent) => {
    event.preventDefault();setError("");setMessage("");
    if (password.length<8){setError("Use at least 8 characters.");return;}
    if(password!==confirm){setError("The new passwords do not match.");return;}
    setSaving(true);
    try {await onChangePassword(password);setMessage("Password updated.");setPassword("");setConfirm("");setEditingPassword(false);}
    catch(e){setError(e instanceof Error?e.message:"Couldn't update your password.");}
    finally{setSaving(false);}
  };
  return <div className="space-y-5 pb-12">
    <div className={card}>
      <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-full bg-[#EDE5DA]"><UserRound className="size-5 text-[#6B5847]" /></span><div className="min-w-0"><p className="font-display text-[27px] leading-tight">{displayName||"Your Keep account"}</p><p className="mt-1 truncate text-xs text-[#877667]">{email}</p></div></div>
      <div className="mt-5 border-t border-[#E9E0D7] pt-5"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8C7661]">YOUR KEEPS AT A GLANCE</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-[#F6F0E8] p-3"><strong className="block font-display text-3xl font-normal">{created}</strong><small className="text-[10px] text-[#816E5D]">Creations</small></div><div className="rounded-xl bg-[#F6F0E8] p-3"><strong className="block font-display text-3xl font-normal">{published}</strong><small className="text-[10px] text-[#816E5D]">Shared</small></div><div className="rounded-xl bg-[#F6F0E8] p-3"><strong className="block font-display text-3xl font-normal">{drafts}</strong><small className="text-[10px] text-[#816E5D]">Drafts</small></div></div>
        <Link to="/my-keeps" className="mt-5 flex min-h-11 items-center justify-between border-t border-[#E9E0D7] pt-4 text-sm">Manage all my Keeps <ArrowRight className="size-4"/></Link>
      </div>
    </div>
    <section className={card}>
      <h2 className="font-display text-[27px]">Your details.</h2>
      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">The information associated with your Keep login.</p>
      <form onSubmit={e=>void saveName(e)} className="mt-5 space-y-3">
        <label className="block text-[11px] font-medium text-[#776554]">Display name
          <input type="text" value={name} maxLength={80} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#DCD1C5] bg-[#FCFAF6] px-4 py-3 text-base outline-none focus:border-[#A18B73]" placeholder="Your name" />
        </label>
        <button disabled={saving||!name.trim()||name.trim()===displayName} className="min-h-11 rounded-xl border border-[#B8A997] px-5 text-xs font-semibold disabled:opacity-40">Save name</button>
      </form>
      <div className="mt-6 border-t border-[#E9E0D7] pt-5">
        <p className="text-[11px] font-medium text-[#776554]">Login email</p><p className="mt-2 break-all text-sm">{email}</p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Your email is used to sign in and manage your Keep creations.</p>
      </div>
    </section>
    <section className={card}>
      <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[#87715B]"/><h2 className="font-display text-[27px]">Security.</h2></div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">Your account is signed in. Only you can manage its saved Keeps. Anyone with a recipient's permanent viewing link can open that gift.</p>
      <button type="button" onClick={()=>setEditingPassword(v=>!v)} className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-[#D8CCBF] px-4 text-sm"><span className="flex items-center gap-2"><LockKeyhole className="size-4"/>Change password</span><ArrowRight className="size-4"/></button>
      {editingPassword&&<form onSubmit={e=>void savePassword(e)} className="mt-4 space-y-3">
        <input aria-label="New password" type="password" autoComplete="new-password" minLength={8} required placeholder="New password (8+ characters)" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border border-[#DCD1C5] bg-[#FCFAF6] px-4 py-3 text-base"/>
        <input aria-label="Confirm new password" type="password" autoComplete="new-password" minLength={8} required placeholder="Confirm new password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="w-full rounded-xl border border-[#DCD1C5] bg-[#FCFAF6] px-4 py-3 text-base"/>
        <button disabled={saving} className="min-h-11 rounded-xl bg-[#29231E] px-5 text-xs font-semibold text-white disabled:opacity-40">{saving?"Updating…":"Update password"}</button>
      </form>}
      {error&&<p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
      {message&&<p role="status" className="mt-3 flex items-center gap-2 text-xs text-[#52744C]"><CheckCircle2 className="size-4"/>{message}</p>}
    </section>
    <section className={card}>
      <h2 className="font-display text-[27px]">Your Keeps &amp; data.</h2>
      <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#E7DCD0] px-4 py-3"><Gift className="mb-2 size-4 text-[#8C7763]" /><p className="font-display text-2xl">{given}</p><p className="text-[11px] text-muted-foreground">Physical cards given</p></div><div className="rounded-xl border border-[#E7DCD0] px-4 py-3"><Heart className="mb-2 size-4 text-[#8C7763]" /><p className="font-display text-2xl">{received}</p><p className="text-[11px] text-muted-foreground">Physical cards received</p></div></div>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">Your Keeps are saved in your account. Their permanent viewing links can be shared with the people you choose. Deleting a published Keep disables its viewing link and any NFC card programmed with it.</p>
      <button type="button" onClick={onExport} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D8CCBF] text-sm"><Download className="size-4"/> Download my Keep details</button>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">Downloads a JSON copy of your Keep metadata and written transcripts, including your current saved draft. Photos, videos and recorded audio are not included in this export.</p>
    </section>
    <section className={card}>
      <div className="flex items-center gap-2"><BookOpen className="size-5 text-[#87715B]"/><h2 className="font-display text-[27px]">Questions &amp; support.</h2></div>
      <details className="mt-4 border-t border-[#E9E0D7] py-4 text-sm"><summary className="cursor-pointer font-medium">Can I update a Keep after sharing it?</summary><p className="mt-3 text-xs leading-6 text-muted-foreground">Yes. Open your creation, make your edits and finish again. The same permanent link stays connected.</p></details>
      <details className="border-t border-[#E9E0D7] py-4 text-sm"><summary className="cursor-pointer font-medium">Can I remove a Keep?</summary><p className="mt-3 text-xs leading-6 text-muted-foreground">Yes. Open its arrow menu under Your Creations or My Keeps and choose Delete this Keep. Deleting is permanent and disables shared links.</p></details>
      <details className="border-t border-[#E9E0D7] py-4 text-sm"><summary className="cursor-pointer font-medium">How do NFC cards work?</summary><p className="mt-3 text-xs leading-6 text-muted-foreground">Program your Keep's permanent viewing link onto the NFC card. Tapping the card opens the recipient's experience in their browser.</p></details>
      <a href="mailto:support@keep.com?subject=Keep%20Support" className="mt-3 flex min-h-12 items-center justify-between rounded-xl border border-[#D8CCBF] px-4 text-sm"><span className="flex items-center gap-2"><Mail className="size-4"/> Contact support</span><ArrowRight className="size-4"/></a>
    </section>
    <button onClick={onSignOut} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#D5C7BA] bg-white text-sm text-[#6F5543]"><LogOut className="size-4"/> Sign out</button>
  </div>;
}
