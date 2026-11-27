/** A permanent, monochrome engraving mark for the card's contactless tap area. */
export function KeepTapPhoneIcon({ className = "", decorative = false }: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Tap your phone here"}
      aria-hidden={decorative || undefined}
      focusable="false"
    >
      <circle cx="16" cy="16" r="15" strokeWidth="1.15" />
      <path d="M8.9 12.4C11.5 14.9 11.5 17.9 8.9 20.4M11.9 10.1C15.6 14 15.9 18.5 12.2 22.5M15.1 7.5C19.8 12.7 20 19.1 15.7 24.8M18.2 4.9C24.4 12.1 24.6 20.1 19.2 27.1" />
    </svg>
  );
}
