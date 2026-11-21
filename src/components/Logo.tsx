export function Logo() {
  return (
    <div
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 -rotate-6 flex-col justify-center gap-1 rounded-xl bg-sticky-yellow-dark px-2.5 shadow-note ring-1 ring-black/10"
    >
      <span className="h-1 w-5 rounded-full bg-stone-900/30" />
      <span className="h-1 w-3.5 rounded-full bg-stone-900/20" />
      <span className="h-1 w-4 rounded-full bg-stone-900/15" />
    </div>
  );
}
