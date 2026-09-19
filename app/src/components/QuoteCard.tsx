import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckIcon, SparkleIcon } from "@phosphor-icons/react";
import type { Draft, Quote } from "../domain/types";
import { currency, inr, inrExact } from "../domain/pricing";
import { Card, Chips, Field, Input, Money, Pill, Primary, Quiet, Toggle } from "./ui";

interface Props {
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
  quote: Quote;
  packagingNote: string;
  canLog: boolean;
  onLog: () => void;
  justLogged: boolean;
}

/** Eases toward the new total instead of snapping, so changing a parameter
 *  reads as the price being recalculated rather than replaced. */
function useEased(target: number) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(target);
  const raf = useRef(0);
  const from = useRef(target);
  useEffect(() => {
    if (reduce) { setShown(target); return; }
    from.current = shown;
    const delta = target - from.current;
    if (Math.abs(delta) < 0.5) { setShown(target); return; }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 480);
      setShown(from.current + delta * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setShown(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return shown;
}

export function QuoteCard({ draft, setDraft, quote, packagingNote, canLog, onLog, justLogged }: Props) {
  const reduce = useReducedMotion();
  const [showCustom, setShowCustom] = useState(false);
  const shown = useEased(quote.total);

  const weight = parseFloat(draft.weight) || 0;
  const time = parseFloat(draft.time) || 0;
  const costs = quote.filamentCost + quote.powerCost + quote.labourCost + quote.packagingCost;
  const profit = quote.total - costs;
  const margin = quote.total > 0 ? (profit / quote.total) * 100 : 0;
  const priced = weight > 0 && time > 0;
  const settled = Math.abs(shown - quote.total) < 0.5;

  const tone = draft.freebie ? "var(--bad)" : draft.override !== null ? "var(--good)" : undefined;

  return (
    <Card delay={0} className="w-full flex flex-col overflow-hidden">
      {/* ── the number ─────────────────────────────────────────── */}
      <div className="relative px-6 pt-6 pb-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-[12.5px] font-medium text-ink3">
            {draft.product.trim() || "New print"}
          </p>
          <AnimatePresence>
            {justLogged && (
              <motion.span
                initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
              >
                <Pill tone="good"><CheckIcon size={12} weight="bold" aria-hidden /> Saved</Pill>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div aria-live="polite">
          <Money value={inrExact(settled ? quote.total : Math.round(shown))} size={54} tone={tone} />
        </div>

        <div className="flex items-center gap-2 flex-wrap mt-3.5 min-h-[26px]">
          {!priced && <span className="text-[13px] text-ink3">Add material and run time to price it</span>}
          {priced && !draft.freebie && (
            <>
              <Pill tone="good">{inr(profit)} profit</Pill>
              <Pill>{margin.toFixed(0)}% margin</Pill>
            </>
          )}
          {priced && draft.freebie && <Pill tone="bad">Costs you {inr(costs)}</Pill>}
          {quote.coupon && <Pill tone="acc">{quote.coupon.code.toUpperCase()} · −{inr(quote.discount)}</Pill>}
          {draft.override !== null && !draft.freebie && <Pill tone="good">Custom price</Pill>}
        </div>

        {/* the sheen sweeps once, the moment a sale is committed */}
        <AnimatePresence>
          {justLogged && !reduce && (
            <motion.span
              aria-hidden
              className="sheen pointer-events-none absolute inset-y-0 w-1/3"
              style={{ background: "linear-gradient(90deg,transparent,var(--pane-hi),transparent)" }}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="h-px shrink-0" style={{ background: "var(--edge-2)" }} />

      {/* ── the inputs ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-soft px-6 py-5">
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Material used" htmlFor="q-weight">
            <Input id="q-weight" big unit="g" value={draft.weight} onChange={(v) => setDraft({ weight: v })}
                   placeholder="0" type="number" inputMode="decimal" min={0} step={0.1} autoComplete="off" />
            <Chips options={[{ label: "+10", amount: 10 }, { label: "+25", amount: 25 }, { label: "+50", amount: 50 }]}
                   onPick={(a) => setDraft({ weight: String(Math.round((weight + a) * 100) / 100) })} />
          </Field>
          <Field label="Run time" htmlFor="q-time">
            <Input id="q-time" big unit="h" value={draft.time} onChange={(v) => setDraft({ time: v })}
                   placeholder="0" type="number" inputMode="decimal" min={0} step={0.1} autoComplete="off" />
            <Chips options={[{ label: "+30m", amount: 0.5 }, { label: "+1h", amount: 1 }, { label: "+3h", amount: 3 }]}
                   onPick={(a) => setDraft({ time: String(Math.round((time + a) * 100) / 100) })} />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-4 mt-1">
          <Field label="What is it?" htmlFor="q-product">
            <Input id="q-product" value={draft.product} onChange={(v) => setDraft({ product: v })}
                   placeholder="Articulated dragon…" autoComplete="off" />
          </Field>
          <Field label="Who is it for?" htmlFor="q-customer">
            <Input id="q-customer" value={draft.customer} onChange={(v) => setDraft({ customer: v })}
                   placeholder="Rakesh…" autoComplete="name" />
          </Field>
        </div>

        <Field
          label="Discount code"
          htmlFor="q-coupon"
          hint={
            <p aria-live="polite" className={`text-[12.5px] mt-1.5 min-h-[18px] ${
              !draft.coupon.trim() ? "text-ink3" : quote.coupon ? "text-good" : "text-bad"}`}>
              {!draft.coupon.trim() ? "Optional"
                : quote.coupon ? `${quote.coupon.percent}% off, saving ${inr(quote.discount)}`
                : "No such code. Add it in Settings"}
            </p>
          }
        >
          <Input id="q-coupon" value={draft.coupon} onChange={(v) => setDraft({ coupon: v })}
                 placeholder="FAMILY…" autoComplete="off" spellCheck={false} autoCapitalize="characters" />
        </Field>

        <div className="rounded-2xl px-4 py-1 mt-1" style={{ background: "var(--veil)" }}>
          <Toggle label="Include packaging" note={packagingNote}
                  checked={draft.packaging} onChange={() => setDraft({ packaging: !draft.packaging })} />
          <div className="h-px" style={{ background: "var(--edge-2)" }} />
          <Toggle label="Give it away" note="Zeroes the price, keeps the record" tone="bad"
                  checked={draft.freebie} onChange={() => setDraft({ freebie: !draft.freebie })} />
        </div>

        <AnimatePresence initial={false}>
          {showCustom && (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-3.5">
                <Field label="Name your own price" htmlFor="q-override">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input id="q-override" unit={currency()} type="number" inputMode="decimal" min={0} step={1}
                             value={draft.override === null ? "" : String(draft.override)}
                             onChange={(v) => setDraft({ override: v === "" ? null : parseFloat(v) })}
                             placeholder="Whatever you agreed…" autoComplete="off" />
                    </div>
                    <Quiet onClick={() => { setDraft({ override: null }); setShowCustom(false); }}>Clear</Quiet>
                  </div>
                </Field>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showCustom && (
          <button
            onClick={() => { setShowCustom(true); setDraft({ override: Math.round(quote.total) }); }}
            className="mt-3 text-[12.5px] font-medium text-ink3 hover:text-acc transition-colors inline-flex items-center gap-1.5"
          >
            <SparkleIcon size={13} weight="fill" aria-hidden /> Override the price
          </button>
        )}
      </div>

      <div className="shrink-0 px-6 py-5 border-t" style={{ borderColor: "var(--edge-2)" }}>
        <Primary onClick={onLog} disabled={!canLog} className="w-full">
          {justLogged ? "Added to your ledger" : "Log this sale"}
        </Primary>
      </div>
    </Card>
  );
}
