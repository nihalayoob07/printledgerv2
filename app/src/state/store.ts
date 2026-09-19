import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bill, Coupon, Entry, Settings, SyncState, ThemeId } from "../domain/types";
import {
  loadBills, loadCoupons, loadFirebase, loadLog, loadSettings, loadTheme, runMigrations,
  storeBills, storeCoupons, storeFirebase, storeLog, storeSettings, storeTheme,
} from "../domain/storage";
import { setMoneyFormat } from "../domain/pricing";
import type { Backup } from "../domain/backup";
import { sync } from "../domain/sync";
import type { FirebaseConfig } from "../domain/types";

runMigrations();

/** A mood is the light behind the glass: three blurred sources and an
 *  accent. `canvas` is what the browser chrome matches. */
export const MOODS: { id: ThemeId; name: string; canvas: string; swatch: string }[] = [
  { id: "dawn", name: "Dawn", canvas: "#FBF8F6",
    swatch: "linear-gradient(135deg,#FFD9C4 0%,#E4D4FF 52%,#C7F0E4 100%)" },
  { id: "lagoon", name: "Lagoon", canvas: "#F5FAFC",
    swatch: "linear-gradient(135deg,#BFE9FF 0%,#C6F5E9 52%,#DCE3FF 100%)" },
  { id: "blossom", name: "Blossom", canvas: "#FDF7F8",
    swatch: "linear-gradient(135deg,#FFD7E2 0%,#FFE3C9 52%,#F3DCFF 100%)" },
  { id: "iris", name: "Iris", canvas: "#F7F6FD",
    swatch: "linear-gradient(135deg,#D9D4FF 0%,#C4E0FF 52%,#ECD6FF 100%)" },
  { id: "eclipse", name: "Eclipse", canvas: "#0C0A14",
    swatch: "linear-gradient(135deg,#3B2A63 0%,#123F52 52%,#5A2547 100%)" },
];

export function useLedgerStore() {
  const [settings, setSettingsState] = useState<Settings>(() => {
    const s = loadSettings();
    // money and dates are read from module scope, so this must land before
    // the first render rather than in an effect after it
    setMoneyFormat(s.currency, s.locale);
    return s;
  });
  const [firebase, setFirebaseState] = useState<FirebaseConfig | null>(loadFirebase);
  const [log, setLogState] = useState<Entry[]>(loadLog);
  const [coupons, setCouponsState] = useState<Coupon[]>(loadCoupons);
  const [bills, setBillsState] = useState<Bill[]>(loadBills);
  const [theme, setThemeState] = useState<ThemeId>(loadTheme);
  const [syncState, setSyncState] = useState<SyncState>(
    sync.configured() ? "idle" : "unconfigured");
  const [syncCode, setSyncCode] = useState(sync.code);

  // sync reads the newest values without re-binding its listener on every edit
  const latest = useRef({ settings, log, coupons, bills });
  latest.current = { settings, log, coupons, bills };

  const pushSnapshot = useCallback(() => {
    sync.push(latest.current);
  }, []);

  const setSettings = useCallback((s: Settings) => {
    setMoneyFormat(s.currency, s.locale);
    setSettingsState(s); storeSettings(s);
    latest.current = { ...latest.current, settings: s }; pushSnapshot();
  }, [pushSnapshot]);

  const setLog = useCallback((next: Entry[] | ((prev: Entry[]) => Entry[])) => {
    setLogState((prev) => {
      const value = typeof next === "function" ? (next as (p: Entry[]) => Entry[])(prev) : next;
      storeLog(value);
      latest.current = { ...latest.current, log: value };
      pushSnapshot();
      return value;
    });
  }, [pushSnapshot]);

  const setCoupons = useCallback((v: Coupon[]) => {
    setCouponsState(v); storeCoupons(v);
    latest.current = { ...latest.current, coupons: v }; pushSnapshot();
  }, [pushSnapshot]);

  const setBills = useCallback((next: Bill[] | ((prev: Bill[]) => Bill[])) => {
    setBillsState((prev) => {
      const value = typeof next === "function" ? (next as (p: Bill[]) => Bill[])(prev) : next;
      storeBills(value);
      latest.current = { ...latest.current, bills: value };
      pushSnapshot();
      return value;
    });
  }, [pushSnapshot]);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    storeTheme(t);
    document.documentElement.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", MOODS.find((x) => x.id === t)?.canvas ?? "#FBF8F6");
  }, []);

  useEffect(() => { setTheme(theme); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync is wired last and never throws upward: if the SDK is missing the
  // rest of the app carries on exactly as it would offline.
  useEffect(() => {
    sync.bind(setSyncState, (data) => {
      if (data.settings) {
        setMoneyFormat(data.settings.currency, data.settings.locale);
        setSettingsState(data.settings);
      }
      if (data.log) setLogState(data.log);
      if (data.coupons) setCouponsState(data.coupons);
      if (data.bills) setBillsState(data.bills);
    });
    if (sync.code) {
      try {
        if (!sync.connect(sync.code).ok) setSyncState("error");
      } catch (err) {
        console.error("Sync init failed", err);
        setSyncState("error");
      }
    }
  }, []);

  const connect = useCallback((code: string) => {
    const res = sync.connect(code);
    setSyncCode(sync.code);
    if (res.ok) pushSnapshot();
    return res;
  }, [pushSnapshot]);

  const restore = useCallback((b: Backup) => {
    setMoneyFormat(b.settings.currency, b.settings.locale);
    setSettingsState(b.settings); storeSettings(b.settings);
    setLogState(b.log); storeLog(b.log);
    setCouponsState(b.coupons); storeCoupons(b.coupons);
    setBillsState(b.bills); storeBills(b.bills);
    latest.current = { settings: b.settings, log: b.log, coupons: b.coupons, bills: b.bills };
    pushSnapshot();
  }, [pushSnapshot]);

  const setFirebase = useCallback((c: FirebaseConfig | null) => {
    storeFirebase(c);
    sync.setConfig(c);
    setFirebaseState(c);
    if (!c) { sync.disconnect(); setSyncState("unconfigured"); }
  }, []);

  const disconnect = useCallback(() => {
    sync.disconnect();
    setSyncCode("");
  }, []);

  const stats = useMemo(() => {
    const revenue = log.reduce((s, e) => s + ((e.total || 0) - (e.billDiscount || 0)), 0);
    const grams = log.reduce((s, e) => s + (e.weight || 0), 0);
    const spend = log.reduce(
      (s, e) => s + (e.filamentCost || 0) + (e.powerCost || 0) + (e.labourCost || 0) + (e.packagingCost || 0), 0);
    return {
      count: log.length,
      revenue,
      grams,
      profit: revenue - spend,
      unpaid: log.filter((e) => !e.paid).length,
      queued: log.filter((e) => !e.printDone).length,
    };
  }, [log]);

  return {
    settings, setSettings,
    log, setLog,
    coupons, setCoupons,
    bills, setBills,
    theme, setTheme,
    syncState, syncCode, connect, disconnect,
    firebase, setFirebase,
    restore,
    stats,
  };
}

export type Store = ReturnType<typeof useLedgerStore>;
