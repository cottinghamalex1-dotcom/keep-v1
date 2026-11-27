/** A permanent, monochrome engraving mark for the card's contactless tap area. */
export function KeepTapPhoneIcon({ className = "", decorative = false }: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Tap your phone here"}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      <rect x="3" y="2.25" width="13" height="21.5" rx="2.5" />
      <path d="M8 20.5h3" />
      <path d="M19 9q4 4 0 8M22 6q7 7 0 14M25 3q10 10 0 20" />
    </svg>
  );
}
