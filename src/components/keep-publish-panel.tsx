import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { viewingLink } from "@/lib/keep-publish";

/** A single, readable sharing action. Publishing is owned by the Finish flow. */
export function ViewingLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const url = viewingLink(token);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setManual(false);
    } catch {
      setManual(true);
    }
  };

  return <section aria-label="Share your Keep" className="space-y-3">
    <button type="button" onClick={() => void copy()}
      className="flex min-h-[58px] w-full items-center justify-between gap-3 rounded-xl border border-[#171513] bg-[#171513] px-6 py-4 text-left text-[14px] font-medium text-[#F7F5F2] transition-colors hover:bg-[#312923] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171513]">
      <span>{copied ? "Link copied" : "Copy viewing link"}</span>
      {copied ? <Check aria-hidden="true" className="size-5" /> : <Link2 aria-hidden="true" className="size-5" />}
    </button>
    {manual && <div role="status" className="rounded-lg border border-[#CFC4B8] bg-white p-4">
      <label className="block text-xs leading-5 text-[#51473E]">Select and copy your viewing link
        <input aria-label="Permanent viewing link" type="text" readOnly value={url} onFocus={(event) => event.currentTarget.select()}
          className="mt-2 w-full rounded border border-[#CFC4B8] bg-[#F7F5F2] p-3 text-[16px] text-[#171513]" />
      </label>
    </div>}
    <p className="px-1 text-xs leading-5 text-[#746B61]">This is your permanent link. Add it to your NFC card when you're ready.</p>
  </section>;
}
