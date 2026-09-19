import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { GearSixIcon } from "@phosphor-icons/react";
import type { Bill, Draft, Entry, ThemeId } from "./domain/types";
import { emptyDraft, inr, newEntry, quote } from "./domain/pricing";
import { applyBillToEntries, clearBillFromEntries, makeBill } from "./domain/bills";
import { downloadCsv } from "./domain/exportCsv";
import { MOODS, useLedgerStore } from "./state/store";
import { Mesh } from "./components/Mesh";
import { QuoteCard } from "./components/QuoteCard";
import { BillsCard, RecentCard, RevenueCard, StatusCard } from "./components/cards";
import { LedgerPanel } from "./components/LedgerPanel";
import { BillsPanel } from "./components/BillsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { Toast, type ToastMsg } from "./components/Toast";

/** The three overlays are addressable, so a phone's back gesture closes the
 *  sheet instead of leaving the app. Hash only: pushState is refused on
 *  file:// in some browsers, and this file gets opened straight off disk. */
type PanelId = "" | "ledger" | "bills" | "settings";

const readPanel = (): PanelId => {
  const h = window.location.hash.replace("#", "");
  return h === "ledger" || h === "bills" || h === "settings" ? h : "";
};

const greet = () => {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function App() {
  const {
    settings, setSettings, log, setLog, coupons, setCoupons, bills, setBills,
    theme, setTheme, syncState, syncCode, connect, disconnect, stats,
    firebase, setFirebase, restore,
  } = useLedgerStore();

  const reduce = useReducedMotion();
  const [draft, setDraftState] = useState<Draft>(emptyDraft);
  const [panel, setPanel] = useState<PanelId>(readPanel);
  const [justLogged, setJustLogged] = useState(false);
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef(0);

  const toast = useCallback((text: string, action?: ToastMsg["action"]) => {
    setMsg({ id: Date.now(), text, action });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), action ? 6500 : 3200);
  }, []);
  const closeToast = useCallback(() => {
    window.clearTimeout(timer.current);
    setMsg(null);
  }, []);

  const setDraft = useCallback(
    (patch: Partial<Draft>) => setDraftState((d) => ({ ...d, ...patch })), []);

  const q = useMemo(() => quote(draft, settings, coupons), [draft, settings, coupons]);
  const canLog = (parseFloat(draft.weight) || 0) > 0 && (parseFloat(draft.time) || 0) > 0;

  /* ── actions ──────────────────────────────────────────────────────── */

  const onLog = useCallback(() => {
    if (!canLog) { toast("Add material and run time first"); return; }
    const entry = newEntry(draft, q);
    setLog((prev) => [entry, ...prev]);
    setDraftState(emptyDraft());
    setJustLogged(true);
    window.setTimeout(() => setJustLogged(false), 1800);
    toast(`${entry.product || "Print"} logged at ${inr(entry.total)}`, {
      label: "Undo",
      run: () => setLog((prev) => prev.filter((e) => e.id !== entry.id)),
    });
  }, [canLog, draft, q, setLog, toast]);

  const onPatch = useCallback((id: string, patch: Partial<Entry>) => {
    setLog((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, [setLog]);

  const onDelete = useCallback((id: string) => {
    let gone: Entry | undefined;
    setLog((prev) => {
      gone = prev.find((e) => e.id === id);
      return prev.filter((e) => e.id !== id);
    });
    toast(`Deleted ${gone?.product || "print"}`, {
      label: "Undo",
      run: () => { if (gone) setLog((prev) => [gone as Entry, ...prev]); },
    });
  }, [setLog, toast]);

  const onReprice = useCallback((e: Entry) => {
    setDraftState({
      product: e.product || "",
      customer: e.customer || "",
      weight: e.weight ? String(e.weight) : "",
      time: e.time ? String(e.time) : "",
      coupon: e.couponCode || "",
      packaging: (e.packagingCost || 0) > 0,
      freebie: e.type === "Freebie",
      override: null,
    });
    toast("Loaded back into the quote");
  }, [toast]);

  const onExport = useCallback(() => {
    if (log.length === 0) { toast("Nothing to export yet"); return; }
    downloadCsv(log);
    toast(`Exported ${log.length} print${log.length === 1 ? "" : "s"}`);
  }, [log, toast]);

  const onIssue = useCallback(
    (existing: Bill | null, customer: string, items: Entry[], couponCode: string) => {
      const bill = makeBill(existing, customer, items, couponCode, coupons);
      setBills((prev) => (existing ? prev.map((b) => (b.id === bill.id ? bill : b)) : [bill, ...prev]));
      setLog((prev) => applyBillToEntries(bill, existing ? clearBillFromEntries(bill.id, prev) : prev));
      toast(`${existing ? "Bill updated" : "Bill issued"} · ${inr(bill.total)}`);
    }, [coupons, setBills, setLog, toast]);

  const onDeleteBill = useCallback((bill: Bill) => {
    setBills((prev) => prev.filter((b) => b.id !== bill.id));
    setLog((prev) => clearBillFromEntries(bill.id, prev));
    toast("Bill deleted, discounts reversed", {
      label: "Undo",
      run: () => {
        setBills((prev) => [bill, ...prev]);
        setLog((prev) => applyBillToEntries(bill, prev));
      },
    });
  }, [setBills, setLog, toast]);

  const onTheme = useCallback((t: ThemeId) => {
    setTheme(t);
    toast(`Switched to ${MOODS.find((m) => m.id === t)?.name}`);
  }, [setTheme, toast]);

  useEffect(() => {
    const sync = () => setPanel(readPanel());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  // Going back is only right when we are the ones who pushed the entry. Land
  // straight on #ledger from a bookmark and a back would leave the app, so
  // that case clears the hash instead.
  const pushedByUs = useRef(false);

  const openPanel = useCallback((p: Exclude<PanelId, "">) => {
    try {
      window.location.hash = p;
      pushedByUs.current = true;
    } catch {
      setPanel(p);
    }
  }, []);

  const closePanel = useCallback(() => {
    try {
      if (pushedByUs.current && readPanel()) {
        pushedByUs.current = false;
        window.history.back();
      } else {
        const { pathname, search } = window.location;
        window.history.replaceState(null, "", pathname + search);
        setPanel("");
      }
    } catch {
      setPanel("");
    }
  }, []);

  // the mesh is decorative, but it still shouldn't burn a phone battery in a
  // background tab
  useEffect(() => {
    const onVis = () => {
      document.body.style.setProperty(
        "--mesh-play", document.hidden ? "paused" : "running");
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    document.title = settings.businessName;
  }, [settings.businessName]);

  const recent = useMemo(
    () => [...log].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6),
    [log]);

  const packagingNote = settings.packagingCost > 0
    ? `Adds ${inr(settings.packagingCost)}`
    : "No packaging cost set yet";

  const lamp = syncState === "unconfigured" ? "var(--ink-4)"
    : syncState === "connected" ? "var(--good)"
    : syncState === "syncing" ? "var(--acc)"
    : syncState === "error" ? "var(--bad)" : "var(--ink-4)";
  const lampLabel = syncState === "connected" ? "Sync connected"
    : syncState === "syncing" ? "Syncing now"
    : syncState === "error" ? "Sync problem"
    : "Saved on this device only";

  return (
    <>
      <Mesh />

      <a href="#quote"
         className="sr-only focus:not-sr-only focus:fixed focus:z-[70] focus:top-4 focus:left-4
                    focus:pane focus:rounded-full focus:px-5 focus:py-2.5">
        Skip to the quote
      </a>

      <div className="min-h-dvh w-full overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 pt-[calc(1.5rem+env(safe-area-inset-top))]
                        pb-[calc(6rem+env(safe-area-inset-bottom))]">

          <motion.header
            className="flex items-end justify-between gap-4 mb-6 sm:mb-8"
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="min-w-0">
              <p className="text-[13px] text-ink3">{greet()}</p>
              <h1 className="font-display font-semibold text-[27px] sm:text-[34px] leading-[1.1]
                             tracking-[-0.035em] mt-0.5 truncate">
                {settings.businessName}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:flex items-center gap-2 rounded-full px-3.5 py-2"
                    style={{ background: "var(--veil)" }}>
                <i aria-hidden className="w-2 h-2 rounded-full block" style={{ background: lamp }} />
                <span className="text-[12.5px] text-ink2">{syncCode ? "Synced" : "This device"}</span>
                <span className="sr-only">{lampLabel}</span>
              </span>
              <button
                onClick={() => openPanel("settings")}
                aria-label="Settings"
                className="grid place-items-center w-11 h-11 rounded-full text-ink2
                           transition-[background,color,transform] duration-200
                           hover:text-ink active:scale-[0.93]"
                style={{ background: "var(--veil)" }}
              >
                <GearSixIcon size={19} aria-hidden />
              </button>
            </div>
          </motion.header>

          {/* items-start is load-bearing: without it the side cards stretch to
              the quote card's height and open up a void under each one. */}
          <main id="quote" className="grid gap-4 sm:gap-5 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2 flex min-w-0">
              <QuoteCard
                draft={draft} setDraft={setDraft} quote={q} packagingNote={packagingNote}
                canLog={canLog} onLog={onLog} justLogged={justLogged}
              />
            </div>

            <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
              <RevenueCard log={log} revenue={stats.revenue} profit={stats.profit} delay={0.06} />
              <StatusCard
                total={stats.count} unpaid={stats.unpaid} queued={stats.queued}
                delay={0.12} onOpen={() => openPanel("ledger")}
              />
            </div>

            <div className="lg:col-span-2 flex min-w-0">
              <RecentCard
                recent={recent} onPick={onReprice} onOpen={() => openPanel("ledger")} delay={0.18}
              />
            </div>
            <BillsCard bills={bills} onOpen={() => openPanel("bills")} delay={0.24} />
          </main>
        </div>
      </div>

      <LedgerPanel
        open={panel === "ledger"} onClose={closePanel} log={log}
        onPatch={onPatch} onDelete={onDelete} onReprice={onReprice} onExport={onExport}
      />
      <BillsPanel
        open={panel === "bills"} onClose={closePanel}
        log={log} bills={bills} coupons={coupons} onIssue={onIssue} onDelete={onDeleteBill}
      />
      <SettingsPanel
        open={panel === "settings"} onClose={closePanel}
        settings={settings} onSaveSettings={setSettings}
        coupons={coupons} onSaveCoupons={setCoupons}
        theme={theme} onTheme={onTheme}
        syncState={syncState} syncCode={syncCode}
        firebase={firebase} onFirebase={setFirebase}
        log={log} bills={bills} onRestore={restore}
        onConnect={(code) => toast(connect(code).message)}
        onDisconnect={() => { disconnect(); toast("Sync disconnected"); }}
        toast={toast}
      />

      <Toast msg={msg} onClose={closeToast} />
    </>
  );
}
