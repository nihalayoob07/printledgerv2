import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CheckIcon, DownloadSimpleIcon, MagnifyingGlassIcon, PencilSimpleIcon, TrashIcon,
} from "@phosphor-icons/react";
import type { Bill, Coupon, Entry } from "../domain/types";
import { billCandidates, billTotals } from "../domain/bills";
import { billSize, renderBill } from "../domain/billImage";
import { downloadDataUrl } from "../domain/exportCsv";
import { inr, locale } from "../domain/pricing";
import { Panel } from "./Panel";
import { Field, Input, Primary, Quiet } from "./ui";

export function BillsPanel({ open, onClose, log, bills, coupons, onIssue, onDelete }: {
  open: boolean;
  onClose: () => void;
  log: Entry[];
  bills: Bill[];
  coupons: Coupon[];
  onIssue: (existing: Bill | null, customer: string, items: Entry[], couponCode: string) => void;
  onDelete: (bill: Bill) => void;
}) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"make" | "issued">("make");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [customer, setCustomer] = useState("");
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Bill | null>(null);
  const [viewing, setViewing] = useState<Bill | null>(null);

  const candidates = useMemo(
    () => billCandidates(log, editing?.id ?? null, query), [log, editing, query]);
  const chosen = useMemo(() => log.filter((e) => picked.has(e.id)), [log, picked]);
  const totals = billTotals(chosen, code, coupons);

  const reset = () => { setPicked(new Set()); setCustomer(""); setCode(""); setEditing(null); };

  const issue = () => {
    if (chosen.length === 0) return;
    onIssue(editing, customer, chosen, code);
    reset();
    setTab("issued");
  };

  const edit = (b: Bill) => {
    setEditing(b);
    setCustomer(b.customer || "");
    setCode(b.couponCode || "");
    setPicked(new Set(b.items.map((i) => i.id)));
    setViewing(null);
    setTab("make");
  };

  const preview = viewing ? renderBill(viewing) : null;
  const size = viewing ? billSize(viewing) : { W: 720, H: 600 };

  return (
    <Panel
      open={open}
      onClose={() => { setViewing(null); onClose(); }}
      title={editing ? "Edit this bill" : "Bills"}
      hint={editing ? "Change what’s on it, then save" : "Group finished prints into one bill"}
      wide
    >
      <div className="flex gap-1 mb-4" role="group" aria-label="Bills view">
        {([["make", editing ? "Editing" : "Make one"], ["issued", `Issued ${bills.length}`]] as const).map(
          ([id, label]) => {
            const on = tab === id;
            return (
              <button
                key={id}
                aria-pressed={on}
                onClick={() => { if (id === "make" && !editing) reset(); setTab(id); }}
                className={`relative rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-200
                            ${on ? "text-acc-ink" : "text-ink3 hover:text-ink"}`}
              >
                {on && (
                  <motion.span layoutId="bill-tab" aria-hidden className="absolute inset-0 rounded-full"
                    style={{ background: "var(--acc)" }}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 38 }} />
                )}
                <span className="relative">{label}</span>
              </button>
            );
          })}
      </div>

      {tab === "make" ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-5">
          <div className="min-w-0">
            <div className="relative mb-3">
              <MagnifyingGlassIcon size={16} aria-hidden
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none" />
              <label className="sr-only" htmlFor="bill-search">Search prints to add</label>
              <input
                id="bill-search" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a print to add…" type="search" autoComplete="off"
                className="w-full rounded-full border pl-11 pr-4 py-3 text-[14.5px] outline-none
                           transition-[border-color,box-shadow] duration-200
                           focus:border-acc focus:shadow-[0_0_0_4px_var(--acc-soft)] placeholder:text-ink4"
                style={{ background: "var(--veil)", borderColor: "var(--edge-2)" }}
              />
            </div>

            {candidates.length === 0 ? (
              <p className="py-10 text-center text-[14px] text-ink3">
                No prints available to bill right now.
              </p>
            ) : candidates.map((e, i) => {
              const on = picked.has(e.id);
              return (
                <motion.button
                  key={e.id}
                  onClick={() => setPicked((p) => {
                    const n = new Set(p);
                    if (n.has(e.id)) n.delete(e.id); else n.add(e.id);
                    return n;
                  })}
                  aria-pressed={on}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(i, 10) * 0.022 }}
                  className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 mb-1.5 text-left
                             transition-[background] duration-200 hover:bg-veil"
                  style={on ? { background: "var(--acc-soft)" } : undefined}
                >
                  <span aria-hidden
                    className="grid place-items-center w-[22px] h-[22px] rounded-full shrink-0 transition-colors duration-200"
                    style={{ background: on ? "var(--acc)" : "transparent",
                             boxShadow: on ? "none" : "inset 0 0 0 1.5px var(--edge-2)" }}>
                    {on && <CheckIcon size={12} weight="bold" color="var(--acc-ink)" />}
                  </span>
                  <span className="flex-1 min-w-0 block">
                    <span className="block text-[14px] font-medium truncate">{e.product || "Untitled"}</span>
                    <span className="block text-[11.5px] text-ink3 truncate">{e.customer || "Walk-in"}</span>
                  </span>
                  <span className="shrink-0 text-[14px] font-semibold tnum">{inr(e.total || 0)}</span>
                </motion.button>
              );
            })}
          </div>

          <aside className="lg:sticky lg:top-1 h-max rounded-3xl p-5" style={{ background: "var(--veil)" }}>
            <Field label="Bill to" htmlFor="bill-customer">
              <Input id="bill-customer" value={customer} onChange={setCustomer}
                     placeholder="Rakesh…" autoComplete="name" />
            </Field>
            <Field
              label="Discount code"
              htmlFor="bill-coupon"
              hint={
                <p aria-live="polite" className={`text-[12.5px] mt-1.5 min-h-[18px] ${
                  !code.trim() ? "text-ink3" : totals.coupon ? "text-good" : "text-bad"}`}>
                  {!code.trim() ? "Optional"
                    : totals.coupon ? `${totals.coupon.percent}% off the whole bill`
                    : "No such code. Add it in Settings"}
                </p>
              }
            >
              <Input id="bill-coupon" value={code} onChange={setCode}
                     placeholder="FAMILY…" autoComplete="off" spellCheck={false} autoCapitalize="characters" />
            </Field>

            <div className="h-px my-4" style={{ background: "var(--edge-2)" }} />

            <Line label={`${chosen.length} print${chosen.length === 1 ? "" : "s"}`} value={inr(totals.subtotal)} />
            {totals.discount > 0 && (
              <Line label={`${totals.coupon?.code.toUpperCase()} discount`}
                    value={`−${inr(totals.discount)}`} tone="var(--good)" />
            )}
            <div className="flex items-baseline justify-between gap-3 mt-3">
              <span className="text-[13px] text-ink2">Total</span>
              <span className="font-display font-semibold text-[26px] tnum tracking-[-0.03em]">
                {inr(totals.grandTotal)}
              </span>
            </div>

            <Primary onClick={issue} disabled={chosen.length === 0} className="w-full mt-4">
              {editing ? "Save changes" : "Issue this bill"}
            </Primary>
            {editing && (
              <Quiet className="w-full mt-2" onClick={() => { reset(); setTab("issued"); }}>
                Cancel
              </Quiet>
            )}
          </aside>
        </div>
      ) : bills.length === 0 ? (
        <p className="py-14 text-center text-[14px] text-ink3">No bills issued yet.</p>
      ) : (
        <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-5">
          <div className="min-w-0">
            {[...bills].sort((a, b) => +new Date(b.date) - +new Date(a.date)).map((b, i) => {
              const when = new Date(b.date);
              const on = viewing?.id === b.id;
              return (
                <motion.button
                  key={b.id}
                  onClick={() => setViewing(on ? null : b)}
                  aria-pressed={on}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(i, 10) * 0.025 }}
                  className="w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 mb-1.5 text-left
                             transition-[background] duration-200 hover:bg-veil"
                  style={on ? { background: "var(--acc-soft)" } : undefined}
                >
                  <span className="flex-1 min-w-0 block">
                    <span className="block text-[14px] font-medium truncate">
                      {b.customer || "Walk-in customer"}
                    </span>
                    <span className="block text-[11.5px] text-ink3">
                      {b.items.length} item{b.items.length === 1 ? "" : "s"}
                      {Number.isNaN(when.getTime()) ? "" :
                        ` · ${when.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "2-digit" })}`}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-[14px] font-semibold tnum">{inr(b.total)}</span>
                    {b.discount > 0 && (
                      <span className="block text-[11px] tnum" style={{ color: "var(--good)" }}>
                        −{inr(b.discount)}
                      </span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              {viewing && preview ? (
                <motion.div
                  key={viewing.id}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="rounded-3xl overflow-hidden" style={{ boxShadow: "var(--cast)" }}>
                    <img src={preview} width={size.W} height={size.H} loading="lazy" className="w-full h-auto block"
                         alt={`Bill for ${viewing.customer || "walk-in customer"}`} />
                  </div>
                  <div className="flex gap-2 flex-wrap mt-3">
                    <Quiet onClick={() => downloadDataUrl(
                      preview, `bill-${(viewing.customer || "customer").replace(/\W+/g, "-").toLowerCase()}.png`)}>
                      <DownloadSimpleIcon size={14} aria-hidden /> Download
                    </Quiet>
                    <Quiet onClick={() => edit(viewing)}>
                      <PencilSimpleIcon size={14} aria-hidden /> Edit
                    </Quiet>
                    <Quiet tone="bad" onClick={() => { onDelete(viewing); setViewing(null); }}>
                      <TrashIcon size={14} aria-hidden /> Delete
                    </Quiet>
                  </div>
                </motion.div>
              ) : (
                <motion.p key="empty" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}
                  className="hidden lg:block py-16 text-center text-[14px] text-ink3">
                  Pick a bill to see it.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-[13px] text-ink3">{label}</span>
      <span className="text-[13.5px] font-medium tnum" style={{ color: tone }}>{value}</span>
    </div>
  );
}
