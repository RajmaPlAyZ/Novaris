export const AvarisCredit = () => {
  return (
    <div className="flex flex-col items-center gap-2 py-8">
      <p className="text-muted-foreground/40 text-[10px] font-medium tracking-[0.25em] uppercase">
        An internship project by
      </p>
      <a
        href="https://www.avarislabs.in/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground/70 text-3xl font-black tracking-[0.15em] opacity-70 transition-all hover:opacity-100 hover:text-foreground select-none sm:text-4xl"
        style={{ fontFamily: "var(--font-orbitron)" }}
      >
        AVARIS
      </a>
    </div>
  );
};
