import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from './ui/button';
import { publishKeep, viewingLink } from '@/lib/keep-publish';
import { saveDraft, type KeepProject } from '@/lib/keep-project';

export function ViewingLink({token}: {token: string}) {
  const [copied,setCopied] = useState(false);
  const [manual,setManual] = useState(false);
  const url = viewingLink(token);
  return <div className="space-y-3 rounded-xl border border-border p-4">
    <label className="block text-sm">Your permanent viewing link<input aria-label="Permanent viewing link" readOnly value={url} onFocus={e=>e.currentTarget.select()} className="mt-2 w-full min-w-0 rounded-lg border border-border bg-background p-3 text-base" /></label>
    <Button variant="keep" className="w-full" onClick={async()=>{try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setManual(true); }}}>{copied ? 'Link copied' : 'Copy viewing link'}</Button>
    {manual && <p role="status" className="text-xs text-muted-foreground">Tap the link above, select all, then Copy.</p>}
    <a className="block py-2 text-center text-sm underline" href={url} target="_blank" rel="noreferrer">Open finished Keep</a>
    <p className="text-xs leading-5 text-muted-foreground">Paste this link into NFC Tools → Write → URL / URI. Anyone with this link can view your Keep.</p>
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
    <Button variant="keep" size="touch" className="w-full" disabled={busy} onClick={()=>void publish()}>{busy ? 'Publishing…' : project.publicationToken ? 'Update published Keep' : 'Publish my Keep'}</Button>
    <p className="text-xs leading-5 text-muted-foreground">{project.publicationToken?'Updates keep the same link. Your card will open the latest published version.':'Save your finished voice, photos and edits, then get a link for your card.'}</p>
    {busy && <p role="status" className="text-sm text-accent">{status} Keep this page open.</p>}
    {error && <div role="alert" className="space-y-2 text-sm"><p>{error}</p>{error.startsWith('Sign in') && <Link to="/app" className="inline-block py-3 underline">Sign in / create account</Link>}</div>}
  </section>;
}
