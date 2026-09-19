/** The light behind everything. Three heavily blurred blobs drifting on
 *  long, offset cycles so the background is never quite the same twice.
 *  Pure decoration — hidden from assistive tech, transform-only motion. */
export function Mesh() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" style={{ background: "var(--canvas)" }}>
      <div
        className="blob-a absolute -top-[26%] -left-[18%] w-[88vw] h-[88vw] rounded-full"
        style={{ background: "radial-gradient(circle, var(--aur-1) 0%, transparent 74%)", filter: "blur(58px)" }}
      />
      <div
        className="blob-b absolute -top-[6%] -right-[22%] w-[84vw] h-[84vw] rounded-full"
        style={{ background: "radial-gradient(circle, var(--aur-2) 0%, transparent 74%)", filter: "blur(62px)" }}
      />
      <div
        className="blob-c absolute -bottom-[32%] left-[8%] w-[94vw] h-[94vw] rounded-full"
        style={{ background: "radial-gradient(circle, var(--aur-3) 0%, transparent 72%)", filter: "blur(66px)" }}
      />
      {/* a whisper of grain, so the gradients never band on cheap panels */}
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
