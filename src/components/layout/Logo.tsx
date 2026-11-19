export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect x="3" y="3" width="26" height="12" rx="3" className="fill-brand-500" />
        <rect x="3" y="17" width="12" height="12" rx="3" className="fill-neutral-100" />
        <rect x="17" y="17" width="12" height="12" rx="3" className="fill-brand-400" />
      </svg>
      <span className="text-lg font-extrabold tracking-tight">Koma Kit</span>
    </div>
  );
}
