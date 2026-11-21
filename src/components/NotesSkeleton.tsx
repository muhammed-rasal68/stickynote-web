export function NotesSkeleton() {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[176px] animate-pulse rounded-[22px] bg-white/50 p-4 ring-1 ring-stone-900/5"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className="h-3.5 w-3/4 rounded-full bg-stone-900/10" />
          <div className="mt-4 space-y-2">
            <div className="h-2.5 w-full rounded-full bg-stone-900/[0.07]" />
            <div className="h-2.5 w-5/6 rounded-full bg-stone-900/[0.07]" />
            <div className="h-2.5 w-2/3 rounded-full bg-stone-900/[0.07]" />
          </div>
          <div className="mt-12 flex justify-between">
            <div className="h-2 w-12 rounded-full bg-stone-900/[0.07]" />
            <div className="h-2 w-8 rounded-full bg-stone-900/[0.07]" />
          </div>
        </div>
      ))}
    </div>
  );
}
