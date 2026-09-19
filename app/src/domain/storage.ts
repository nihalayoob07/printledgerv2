import type { Bill, Coupon, Entry, FirebaseConfig, Settings, ThemeId } from "./types";

/** These key names are the contract with every device already syncing.
 *  Do not rename them without a migration. */
export const KEY = {
  settings: "printLedger_settings_v1",
  log: "printLedger_log_v1",
  coupons: "printLedger_coupons_v1",
  bills: "printLedger_bills_v1",
  syncCode: "printLedger_syncCode_v1",
  firebase: "printLedger_firebase_v1",
  theme: "printLedger_theme_v1",
  seeded: "printLedger_seeded_v2",
  migPaidDone: "printLedger_migration_paidDone_v1",
  migFirstCoupon: "printLedger_migration_firstCoupon25_v1",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  businessName: "Print Ledger",
  currency: "₹",
  locale: "en-IN",
  filamentCostPerKg: 1200,
  printerWatts: 220,
  electricityRate: 9.5,
  labourRate: 40,
  packagingCost: 0,
  profitPercent: 35,
};

export const DEFAULT_COUPONS: Coupon[] = [
  { code: "FAMILY", percent: 15 },
  { code: "FIRST", percent: 25 },
  { code: "REGULAR", percent: 20 },
];

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or quota: the app still works for this session */
  }
}

export const loadSettings = (): Settings => ({
  ...DEFAULT_SETTINGS,
  ...read<Partial<Settings>>(KEY.settings, {}),
});
export const storeSettings = (s: Settings) => write(KEY.settings, s);

export const loadLog = () => read<Entry[]>(KEY.log, []);
export const storeLog = (v: Entry[]) => write(KEY.log, v);

export function loadCoupons(): Coupon[] {
  if (localStorage.getItem(KEY.coupons) === null) {
    write(KEY.coupons, DEFAULT_COUPONS);
    return [...DEFAULT_COUPONS];
  }
  return read<Coupon[]>(KEY.coupons, [...DEFAULT_COUPONS]);
}
export const storeCoupons = (v: Coupon[]) => write(KEY.coupons, v);

export const loadBills = () => read<Bill[]>(KEY.bills, []);
export const storeBills = (v: Bill[]) => write(KEY.bills, v);

export const THEME_IDS: ThemeId[] = ["dawn", "lagoon", "blossom", "iris", "eclipse"];

/** Devices carry a mood name from the previous build, which is no longer one
 *  of ours. Anything unrecognised falls back rather than rendering unstyled. */
export const loadTheme = (): ThemeId => {
  const saved = localStorage.getItem(KEY.theme) as ThemeId | null;
  if (saved && THEME_IDS.includes(saved)) return saved;
  // no choice made yet: follow the system. Must match the pre-paint script
  // in index.html, or the first frame flashes the wrong mood.
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "eclipse" : "dawn";
};
export const storeTheme = (t: ThemeId) => localStorage.setItem(KEY.theme, t);

export const loadFirebase = () => read<FirebaseConfig | null>(KEY.firebase, null);
export const storeFirebase = (c: FirebaseConfig | null) => {
  if (c) write(KEY.firebase, c);
  else localStorage.removeItem(KEY.firebase);
};

/** Accepts either raw JSON or the `const firebaseConfig = {...}` snippet the
 *  Firebase console shows, because that is what people actually paste. */
export function parseFirebaseConfig(raw: string): FirebaseConfig | null {
  const body = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!body) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    try {
      // quote bare keys and drop trailing commas, then retry as JSON
      parsed = JSON.parse(
        body.replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
            .replace(/,(\s*[}\]])/g, "$1")
            .replace(/'/g, '"'),
      );
    } catch {
      return null;
    }
  }
  const c = parsed as FirebaseConfig;
  if (!c || typeof c.apiKey !== "string" || typeof c.databaseURL !== "string") return null;
  return c;
}

/** One-time fixups carried over from the previous build. Each is guarded by
 *  its own flag so it runs exactly once per device, as before. */
export function runMigrations() {
  if (!localStorage.getItem(KEY.seeded)) {
    write(KEY.log, []);
    localStorage.setItem(KEY.seeded, "1");
  }

  // CSV-imported history is completed work, not open orders
  if (!localStorage.getItem(KEY.migPaidDone)) {
    const entries = loadLog();
    let changed = false;
    for (const e of entries) {
      if (typeof e.id === "string" && e.id.startsWith("imp")) {
        if (!e.paid) { e.paid = true; changed = true; }
        if (!e.printDone) { e.printDone = true; changed = true; }
      }
    }
    if (changed) write(KEY.log, entries);
    localStorage.setItem(KEY.migPaidDone, "1");
  }

  // FIRST dropped 30% -> 25%, but only if it was never hand-edited
  if (!localStorage.getItem(KEY.migFirstCoupon)) {
    const raw = localStorage.getItem(KEY.coupons);
    if (raw) {
      try {
        const list = JSON.parse(raw) as Coupon[];
        const first = list.find((c) => c.code?.toUpperCase() === "FIRST");
        if (first && first.percent === 30) {
          first.percent = 25;
          write(KEY.coupons, list);
        }
      } catch {
        /* leave coupons alone if they are unreadable */
      }
    }
    localStorage.setItem(KEY.migFirstCoupon, "1");
  }
}
