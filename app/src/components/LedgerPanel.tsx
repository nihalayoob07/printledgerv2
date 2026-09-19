import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowsClockwiseIcon, CaretDownIcon, MagnifyingGlassIcon, TrashIcon, UploadSimpleIcon,
} from "@phosphor-icons/react";
import type { Entry } from "../domain/types";
import { costOf, currency, inr, locale, netTotal, profitOf } from "../domain/pricing";
import { Panel } from "./Panel";
import { Input, Pill, Quiet, Toggle } from "./ui";

type Filter = "all" | "unpaid" | "queued";
type Sort = "newest" | "biggest" | "name";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "unpaid", label: "Unpaid" },
  { id: "queued", label: "Still to print" },
];

const SORTS: { id: Sort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "biggest", label: "Biggest" },
  { id: "name", label: "A-Z" },
];

const PAGE = 40;

export function LedgerPanel({ open, onClose, log, onPatch, onDelete, onReprice, onExport }: {
  open: boolean;
  onClose: () => void;
  log: Entry[];
  onPatch: (id: string, patch: Partial<Entry>) => void;
  onDelete: (id: string) => void;
  onReprice: (e: Entry) => void;
  onExport: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [openId, setOpenId] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    let out = log;
    if (filter === "unpaid") out = out.filter((e) => !e.paid);
    if (filter === "queued") out = out.filter((e) => !e.printDone);
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((e) =>
      (e.product || "").toLowerCase().includes(q) || (e.customer || "").toLowerCase().includes(q));
    const by = {
      newest: (a: Entry, b: Entry) => +new Date(b.date) - +new Date(a.date),
      biggest: (a: Entry, b: Entry) => netTotal(b) - netTotal(a),
      name: (a: Entry, b: Entry) => (a.product || "").localeCompare(b.product || ""),
    }[sort];
    return [...out].sort(by);
  }, [log, filter, query, sort]);

  const visible = rows.slice(0, shown);
  const takings = rows.reduce((s, e) => s + netTotal(e), 0);

  return (
    <Panel
      open={open}
      onClose={onClose}
      title="Your ledger"
      hint={`${rows.length} print${rows.length === 1 ? "" : "s"} · ${inr(takings)} collected`}
      wide
      actions={
        <button onClick={onExport} aria-label="Export as CSV"
          className="shrink-0 grid place-items-center w-10 h-10 rounded-full text-ink2
                     transition-[background,transform] duration-200 hover:text-ink active:scale-[0.93]"
          style={{ background: "var(--veil)" }}>
          <UploadSimpleIcon size={17} aria-hidden />
        </button>
      }
    >
      <div className="sticky top-0 z-10 -mx-6 px-6 pb-3 pt-1 backdrop-blur-xl"
           style={{ background: "var(--pane)" }}>
        <div className="relative">
          <MagnifyingGlassIcon size={16} aria-hidden
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none" />
          <label className="sr-only" htmlFor="led-search">Search your prints</label>
          <input
            id="led-search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }}
            placeholder="Search a product or a customer…"
            type="search"
            autoComplete="off"
            className="w-full rounded-full border pl-11 pr-4 py-3 text-[14.5px] outline-none
                       transition-[border-color,box-shadow] duration-200
                       focus:border-acc focus:shadow-[0_0_0_4px_var(--acc-soft)] placeholder:text-ink4"
            style={{ background: "var(--veil)", borderColor: "var(--edge-2)" }}
          />
        </div>

        {/* wraps rather than scrolls: a half-sliced pill reads as broken, and
            there is no affordance telling you to swipe it */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-3">
          <Segmented items={FILTERS} value={filter} onPick={(v) => { setFilter(v); setShown(PAGE); }} label="Filter" />
          <span aria-hidden className="hidden sm:block w-px shrink-0 self-stretch my-1"
                style={{ background: "var(--edge-2)" }} />
          <Segmented items={SORTS} value={sort} onPick={setSort} label="Sort" />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-14 text-center text-[14px] text-ink3">
          {log.length === 0 ? "Nothing logged yet." : "No prints match that."}
        </p>
      ) : visible.map((e, i) => (
        <Row
          key={e.id}
          entry={e}
          index={i}
          open={openId === e.id}
          onToggle={() => setOpenId(openId === e.id ? null : e.id)}
          onPatch={onPatch}
          onDelete={onDelete}
          onReprice={(x) => { onReprice(x); onClose(); }}
        />
      ))}

      {shown < rows.length && (
        <button onClick={() => setShown((n) => n + PAGE)}
          className="w-full rounded-2xl py-3.5 mt-2 text-[13.5px] font-medium text-acc
                     transition-[background] duration-200 hover:bg-acc-soft">
          Show {Math.min(PAGE, rows.length - shown)} more
        </button>
      )}
    </Panel>
  );
}

function Segmented<T extends string>({ items, value, onPick, label }: {
  items: { id: T; label: string }[]; value: T; onPick: (v: T) => void; label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex gap-1 shrink-0" role="group" aria-label={label}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            aria-pressed={on}
            onClick={() => onPick(it.id)}
            className={`relative shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-medium
                        transition-colors duration-200 ${on ? "text-acc-ink" : "text-ink3 hover:text-ink"}`}
          >
            {on && (
              <motion.span
                layoutId={`seg-${label}`}
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{ background: "var(--acc)" }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            <span className="relative">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Row({ entry, index, open, onToggle, onPatch, onDelete, onReprice }: {
  entry: Entry; index: number; open: boolean; onToggle: () => void;
  onPatch: (id: string, patch: Partial<Entry>) => void;
  onDelete: (id: string) => void;
  onReprice: (e: Entry) => void;
}) {
  const reduce = useReducedMotion();
  const [price, setPrice] = useState(String(entry.total));
  const net = netTotal(entry);
  const profit = profitOf(entry);
  const when = new Date(entry.date);
  const billed = (entry.billDiscount || 0) > 0;

  const commit = () => {
    const v = parseFloat(price);
    if (!Number.isNaN(v) && v >= 0 && v !== entry.total) onPatch(entry.id, { total: v });
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 12) * 0.022 }}
      className="rounded-3xl mb-1.5 transition-[background] duration-200"
      style={open ? { background: "var(--veil)" } : undefined}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-3xl
                   transition-[background] duration-200 hover:bg-veil"
      >
        <span className="flex-1 min-w-0 block">
          <span className="block text-[14.5px] font-medium truncate">{entry.product || "Untitled"}</span>
          <span className="block text-[12px] text-ink3 truncate">
            {entry.customer || "Walk-in"}
            {Number.isNaN(when.getTime()) ? "" :
              ` · ${when.toLocaleDateString(locale(), { day: "numeric", month: "short" })}`}
          </span>
        </span>
        {!entry.paid && <Pill tone="bad">Unpaid</Pill>}
        <span className="text-right shrink-0">
          {/* a billed print shows what it listed at, struck through, so the
              discount is visible without another line of metadata */}
          {billed && (
            <s className="block text-[11px] text-ink4 tnum">{inr(entry.total || 0)}</s>
          )}
          <span className="block text-[15px] font-semibold tnum">{inr(net)}</span>
          <span className="block text-[11.5px] tnum" style={{ color: profit < 0 ? "var(--bad)" : "var(--good)" }}>
            {profit >= 0 ? "+" : "−"}{inr(Math.abs(profit))}
          </span>
        </span>
        <CaretDownIcon size={15} aria-hidden
          className={`shrink-0 text-ink4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-4 mb-4">
                {[
                  ["Material", `${Math.round((entry.weight || 0) * 100) / 100} g`],
                  ["Run time", `${Math.round((entry.time || 0) * 100) / 100} h`],
                  ["Cost to make", inr(costOf(entry))],
                  ["List price", inr(entry.total || 0)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11.5px] text-ink3">{k}</dt>
                    <dd className="text-[14px] font-medium tnum mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="rounded-2xl px-4 py-1 mb-3" style={{ background: "var(--pane-hi)" }}>
                <Toggle label="Paid for" checked={entry.paid}
                        onChange={() => onPatch(entry.id, { paid: !entry.paid })} />
                <div className="h-px" style={{ background: "var(--edge-2)" }} />
                <Toggle label="Printed" checked={entry.printDone}
                        onChange={() => onPatch(entry.id, { printDone: !entry.printDone })} />
              </div>

              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[150px]">
                  <label htmlFor={`price-${entry.id}`} className="block text-[12px] text-ink3 mb-1.5">
                    Change the price
                  </label>
                  <Input id={`price-${entry.id}`} unit={currency()} type="number" inputMode="decimal"
                         min={0} step={1} value={price} onChange={setPrice}
                         onBlur={commit} autoComplete="off" />
                </div>
                <Quiet onClick={() => onReprice(entry)}>
                  <ArrowsClockwiseIcon size={14} aria-hidden /> Requote
                </Quiet>
                <Quiet tone="bad" onClick={() => onDelete(entry.id)}>
                  <TrashIcon size={14} aria-hidden /> Delete
                </Quiet>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
