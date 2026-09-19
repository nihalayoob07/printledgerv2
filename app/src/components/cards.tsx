import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRightIcon, ReceiptIcon, TableIcon } from "@phosphor-icons/react";
import type { Bill, Entry } from "../domain/types";
import { inr, locale, netTotal } from "../domain/pricing";
import { Card, CardHead, Money, Pill } from "./ui";

/* ── revenue, with the last fortnight drawn underneath ──────────────── */

function series(log: Entry[], days = 14) {
  const today = new Date(); today.setHours(23, 59, 59, 999);
  const buckets = new Array(days).fill(0);
  for (const e of log) {
    const t = new Date(e.date).getTime();
    if (Number.isNaN(t)) continue;
    const ago = Math.floor((today.getTime() - t) / 86400000);
    if (ago >= 0 && ago < days) buckets[days - 1 - ago] += netTotal(e);
  }
  return buckets;
}

function areaPath(values: number[], w: number, h: number) {
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, h - (v / max) * (h - 6) - 3] as const);
  // Catmull-Rom-ish smoothing keeps the line from looking like a chart widget
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return { line: d, fill: `${d} L${w},${h} L0,${h} Z` };
}

export function RevenueCard({ log, revenue, profit, delay }: {
  log: Entry[]; revenue: number; profit: number; delay: number;
}) {
  const reduce = useReducedMotion();
  const data = useMemo(() => series(log), [log]);
  const { line, fill } = useMemo(() => areaPath(data, 300, 74), [data]);
  const fortnight = data.reduce((s, v) => s + v, 0);

  return (
    <Card delay={delay} className="overflow-hidden flex flex-col">
      <CardHead title="Revenue" hint="Everything collected, after bill discounts" />
      <div className="px-6 pt-2">
        <Money value={Math.round(revenue).toLocaleString(locale())} size={38} />
        <div className="flex items-center gap-2 mt-3">
          <Pill tone="good">{inr(profit)} profit</Pill>
          {fortnight > 0 && <Pill>{inr(fortnight)} this fortnight</Pill>}
        </div>
      </div>
      <div className="mt-auto pt-4 flex-1 min-h-[74px] flex items-end">
        <svg viewBox="0 0 300 74" preserveAspectRatio="none" className="w-full h-full min-h-[74px] block" aria-hidden>
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--acc)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path d={fill} fill="url(#rev-fill)"
            initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: delay + 0.25 }} />
          <motion.path d={line} fill="none" stroke="var(--acc)" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, delay: delay + 0.15, ease: [0.22, 1, 0.36, 1] }} />
        </svg>
      </div>
    </Card>
  );
}

/* ── two numbers that need chasing ──────────────────────────────────── */

export function StatusCard({ unpaid, queued, total, delay, onOpen }: {
  unpaid: number; queued: number; total: number; delay: number; onOpen: () => void;
}) {
  return (
    <Card delay={delay}>
      <CardHead title="Where things stand" />
      <div className="px-6 pt-3 pb-6 grid grid-cols-3 gap-3">
        {[
          { n: total, label: total === 1 ? "print" : "prints", tone: undefined },
          { n: unpaid, label: "unpaid", tone: unpaid ? "var(--bad)" : undefined },
          { n: queued, label: "to print", tone: queued ? "var(--warn)" : undefined },
        ].map((s) => (
          <div key={s.label}>
            <p className="font-display font-semibold text-[30px] leading-none tnum tracking-[-0.03em]"
               style={{ color: s.tone }}>
              {s.n}
            </p>
            <p className="text-[12px] text-ink3 mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="px-6 pb-5 -mt-2">
        <button onClick={onOpen}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-acc hover:gap-2.5 transition-[gap]">
          Open the ledger <ArrowUpRightIcon size={14} weight="bold" aria-hidden />
        </button>
      </div>
    </Card>
  );
}

/* ── the last few, tap to reprice ───────────────────────────────────── */

export function RecentCard({ recent, onPick, onOpen, delay }: {
  recent: Entry[]; onPick: (e: Entry) => void; onOpen: () => void; delay: number;
}) {
  const reduce = useReducedMotion();
  return (
    <Card delay={delay} className="flex flex-col overflow-hidden">
      <CardHead
        title="Recently logged"
        hint="Pick one to load it back into the quote"
        action={
          <button onClick={onOpen} aria-label="Open the ledger"
            className="shrink-0 grid place-items-center w-9 h-9 rounded-full text-ink3 hover:text-acc transition-colors"
            style={{ background: "var(--veil)" }}>
            <TableIcon size={16} aria-hidden />
          </button>
        }
      />
      <div className="px-4 pt-3 pb-4 flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-soft">
        {recent.length === 0 ? (
          <p className="px-2 py-6 text-[13px] text-ink3">
            Nothing yet. Price a job above and log it, and it lands here.
          </p>
        ) : recent.map((e, i) => (
          <motion.button
            key={e.id}
            onClick={() => onPick(e)}
            initial={reduce ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: delay + i * 0.045 }}
            className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left
                       transition-[background] duration-200 hover:bg-veil"
          >
            <span className="flex-1 min-w-0 block">
              <span className="block text-[13.5px] font-medium truncate">{e.product || "Untitled"}</span>
              <span className="block text-[11.5px] text-ink3 truncate">{e.customer || "Walk-in"}</span>
            </span>
            {!e.paid && <Pill tone="bad">Unpaid</Pill>}
            <span className="shrink-0 text-[13.5px] font-semibold tnum">{inr(netTotal(e))}</span>
          </motion.button>
        ))}
      </div>
    </Card>
  );
}

/* ── bills ──────────────────────────────────────────────────────────── */

export function BillsCard({ bills, onOpen, delay }: {
  bills: Bill[]; onOpen: () => void; delay: number;
}) {
  const latest = bills.slice(0, 2);
  return (
    <Card delay={delay} className="flex flex-col">
      <CardHead
        title="Bills"
        hint={bills.length === 0 ? "None issued yet" : `${bills.length} issued`}
        action={
          <button onClick={onOpen} aria-label="Open bills"
            className="shrink-0 grid place-items-center w-9 h-9 rounded-full text-ink3 hover:text-acc transition-colors"
            style={{ background: "var(--veil)" }}>
            <ReceiptIcon size={16} aria-hidden />
          </button>
        }
      />
      <div className="px-4 pt-3 pb-4">
        {latest.map((b) => (
          <button key={b.id} onClick={onOpen}
            className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left
                       transition-[background] duration-200 hover:bg-veil">
            <span className="flex-1 min-w-0 block">
              <span className="block text-[13.5px] font-medium truncate">{b.customer || "Walk-in customer"}</span>
              <span className="block text-[11.5px] text-ink3">
                {b.items.length} item{b.items.length === 1 ? "" : "s"}
                {b.discount > 0 ? ` · ${b.couponCode} −${inr(b.discount)}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-[13.5px] font-semibold tnum">{inr(b.total)}</span>
          </button>
        ))}
        <button onClick={onOpen}
          className="w-full mt-1 rounded-2xl px-3 py-3 text-[13px] font-medium text-acc
                     transition-[background] duration-200 hover:bg-acc-soft text-left">
          {bills.length === 0 ? "Make your first bill" : "Make a new bill"}
        </button>
      </div>
    </Card>
  );
}
