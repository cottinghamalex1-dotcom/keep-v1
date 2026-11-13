/** A quiet, editorial introduction to the three steps of creating a Keep. */
export function KeepCreationSteps() {
  const steps = [
    { number: "01", title: "Your words", detail: "The things you want to say." },
    { number: "02", title: "Your moments", detail: "The memories you cherish." },
    { number: "03", title: "Their Keep", detail: "A gift they can revisit." },
  ] as const;

  return (
    <section aria-label="Create a Keep in three steps"
      className="relative z-10 mx-auto mt-9 w-full overflow-hidden rounded-[22px] border border-[#E0D5C7] bg-[#FBF8F3] px-4 pb-6 pt-5 text-left shadow-[0_16px_38px_rgba(62,46,32,.045)] sm:px-6">
      <p className="border-b border-[#E7DED2] pb-4 text-center text-[10px] font-semibold uppercase tracking-[.22em] text-[#86725E]">
        Thoughtfully made, deeply felt
      </p>
      <ol className="mt-5 grid grid-cols-3 divide-x divide-[#DED3C5]">
        {steps.map(({ number, title, detail }) => (
          <li key={number} className="min-w-0 px-2.5 first:pl-0 last:pr-0 sm:px-5">
            <span className="font-display text-[28px] italic leading-none tracking-[-.05em] text-[#A78A70]" aria-hidden="true">{number}</span>
            <span className="mt-3 block h-px w-6 bg-[#BEAB96]" aria-hidden="true" />
            <h3 className="mt-3 font-display text-[clamp(17px,4.4vw,23px)] leading-[1.16] tracking-[-.025em] text-[#2F271F]">{title}</h3>
            <p className="mt-2 text-[10px] leading-[1.6] text-[#786B60] sm:text-[11px]">{detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
