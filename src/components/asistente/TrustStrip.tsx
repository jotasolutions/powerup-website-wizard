import {
  TRUST_RIBBON_LABEL,
  buildTrustMarqueeSegment,
} from "@/lib/trust-content";

function MarqueeTrack({ text }: { text: string }) {
  return (
    <span className="inline-flex shrink-0 items-center px-6 text-[10px] text-white/55">
      <span className="font-medium text-white/90">{TRUST_RIBBON_LABEL}</span>
      <span className="mx-2 text-white/25">—</span>
      <span>{text}</span>
      <span className="mx-3 text-white/20">·</span>
    </span>
  );
}

export function TrustStrip() {
  const names = buildTrustMarqueeSegment();
  const staticLine = `${TRUST_RIBBON_LABEL} — ${names}`;

  return (
    <div className="max-w-full overflow-hidden py-1.5" aria-label={staticLine}>
      {/* Versión estática si el usuario prefiere menos movimiento */}
      <p className="hidden px-4 text-center text-[10px] leading-snug text-white/55 motion-reduce:block">
        <span className="font-medium text-white/90">{TRUST_RIBBON_LABEL}</span>
        <span className="mx-1.5 text-white/25">—</span>
        {names}
      </p>

      <div className="trust-marquee-track flex w-max motion-reduce:hidden">
        <MarqueeTrack text={names} />
        <div aria-hidden>
          <MarqueeTrack text={names} />
        </div>
      </div>
    </div>
  );
}
