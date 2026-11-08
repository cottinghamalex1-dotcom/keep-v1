import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Check, ExternalLink, Link2 } from 'lucide-react';
import { Button } from './ui/button';
import { publishKeep, viewingLink } from '@/lib/keep-publish';
import { saveDraft, type KeepProject } from '@/lib/keep-project';

export function ViewingLink({token}: {token: string}) {
  const [copied,setCopied] = useState(false);
  const [manual,setManual] = useState(false);
  const url = viewingLink(token);
  return <div className="keep-editorial-surface space-y-4 p-5">
    <div>
      <p className="text-[10px] uppercase tracking-[.18em] text-[#C6B49A]">Ready to share</p>
      <h3 className="keep-section-title mt-3">Your Keep is ready.</h3>
      <p className="mt-3 text-xs leading-6 text-white/55">Your permanent link is ready for your Keep card.</p>
    </div>
    <div className="grid gap-2">
      <Button variant="keep" size="touch" className="keep-premium-action w-full justify-between" onClick={async()=>{try { await navigator.clipboard.writeText(url); setCopied(true); setManual(false); } catch { setManual(true); }}}>{copied ? 'Link copied' : 'Copy viewing link'}{copied ? <Check /> : <Link2 />}</Button>
      <a className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[.15] px-4 py-3 text-sm text-[#F6F3ED]" href={url} target="_blank" rel="noreferrer">Open finished Keep <ExternalLink className="size-4" /></a>
    </div>
    {manual && <div role="status"><label className="block text-xs text-white/65">Select and copy your permanent link<input aria-label="Permanent viewing link" readOnly value={url} onFocus={e=>e.currentTarget.select()} className="keep-premium-field mt-2 w-full min-w-0 p-3 text-base" /></label></div>}
    <p className="border-t border-white/[.12] pt-4 text-xs leading-6 text-white/50">Write this link to your NFC card using NFC Tools → Write → URL / URI. Anyone with the link can view this Keep.</p>
  </div>;
}
export function KeepPublishPanel({project,onChange,onPublished}: {project:KeepProject;onChange:(p:Partial<KeepProject>)=>void;onPublished?:()=>void}) {
  const [busy,setBusy] = useState(false);
  const lock = useRef(false);
  const [status,setStatus] = useState('');
  const [error,setError] = useState('');
  async function publish() {
    if (lock.current) return;
    lock.current=true; setBusy(true); setError(''); setStatus('Preparing your Keep…');
    const publicationId = project.publicationId || crypto.randomUUID();
    const next = {...project,publicationId};
    // Persist before the request: a retry after losing the response updates this same Keep.
    onChange({publicationId}); saveDraft(next);
    try {
      const result=await publishKeep(next,publicationId,setStatus);
      const change={publicationId:result.keepId,publicationToken:result.token};
      onChange(change); saveDraft({...next,...change}); onPublished?.();
    } catch(e) {setError(e instanceof Error?e.message:'Publishing failed. Please try again.');}
    finally {lock.current=false;setBusy(false);setStatus('');}
  }
  return <section className="space-y-4">
    {project.publicationToken && <ViewingLink token={project.publicationToken} />}
    <Button variant="keep" size="touch" className="keep-premium-action w-full" disabled={busy} onClick={()=>void publish()}>{busy ? 'Publishing…' : project.publicationToken ? 'Update published Keep' : 'Publish my Keep'}</Button>
    <p className="text-xs leading-5 text-muted-foreground">{project.publicationToken?'Updates keep the same link. Your card will open the latest published version.':'Save your finished voice, photos and edits, then get a link for your card.'}</p>
    {busy && <p role="status" className="text-sm text-accent">{status} Keep this page open.</p>}
    {error && <div role="alert" className="space-y-2 text-sm"><p>{error}</p>{error.startsWith('Sign in') && <Link to="/app" className="inline-block py-3 underline">Sign in / create account</Link>}</div>}
  </section>;
}
