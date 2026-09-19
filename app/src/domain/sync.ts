import type { Bill, Coupon, Entry, FirebaseConfig, Settings, SyncState } from "./types";
import {
  DEFAULT_SETTINGS, KEY, loadFirebase, storeBills, storeCoupons, storeLog, storeSettings,
} from "./storage";

export interface Snapshot {
  settings: Settings;
  log: Entry[];
  coupons: Coupon[];
  bills: Bill[];
}

type Listener = (s: SyncState) => void;
type Merge = (data: Partial<Snapshot>) => void;

declare const firebase: any;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** The sync code is the only credential, so the generated one is long and
 *  random. Ambiguous characters are left out for reading it off a screen. */
export const generateCode = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
};

export const sanitizeCode = (raw: string) =>
  (raw || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");

/** The SDK is a CDN script, so it may simply not be there (offline, blocked,
 *  opened from a file). Sync is optional; nothing here may throw upward. */
class SyncClient {
  private app: unknown = null;
  private ref: any = null;
  private timer: number | null = null;
  private pulling = false;
  private onState: Listener = () => {};
  private onMerge: Merge = () => {};

  code = localStorage.getItem(KEY.syncCode) || "";
  config: FirebaseConfig | null = loadFirebase();

  /** Sync is off until the operator supplies their own Firebase project. */
  configured() {
    return !!this.config;
  }

  setConfig(c: FirebaseConfig | null) {
    this.config = c;
    this.app = null;
    this.ref = null;
  }

  bind(onState: Listener, onMerge: Merge) {
    this.onState = onState;
    this.onMerge = onMerge;
  }

  private available() {
    return typeof firebase !== "undefined" && typeof firebase.initializeApp === "function";
  }

  private init(): boolean {
    if (this.app) return true;
    if (!this.available() || !this.config) return false;
    try {
      this.app = firebase.initializeApp(this.config);
    } catch {
      try { this.app = firebase.app(); } catch { return false; }
    }
    return !!this.app;
  }

  connect(rawCode: string): { ok: boolean; message: string } {
    const code = sanitizeCode(rawCode);
    if (!this.config) {
      this.onState("unconfigured");
      return { ok: false, message: "Add your Firebase project first" };
    }
    if (!code) return { ok: false, message: "Enter a sync code first" };
    if (code.length < 16) {
      // a short code is the whole security model failing, so say so loudly
      this.onState("error");
      return { ok: false, message: "That code is too short. Tap Generate for a safe one." };
    }
    if (!this.init()) {
      this.onState("error");
      return { ok: false, message: "Sync unavailable offline" };
    }

    this.code = code;
    localStorage.setItem(KEY.syncCode, code);

    try {
      this.ref = firebase.database().ref("syncedUsers/" + code);
    } catch (err) {
      console.error("Sync connect failed", err);
      this.ref = null;
      this.onState("error");
      return { ok: false, message: "Sync unavailable" };
    }

    this.onState("syncing");
    this.ref.on(
      "value",
      (snap: any) => {
        const remote = snap.val();
        this.onState("connected");
        if (!remote) { this.push(this.lastPushed); return; }
        this.pulling = true;
        try {
          const merged: Partial<Snapshot> = {};
          if (remote.settings) {
            const settings = { ...DEFAULT_SETTINGS, ...remote.settings };
            merged.settings = settings;
            storeSettings(settings);
          }
          if (remote.log) { merged.log = remote.log; storeLog(remote.log); }
          if (remote.coupons) { merged.coupons = remote.coupons; storeCoupons(remote.coupons); }
          if (remote.bills) { merged.bills = remote.bills; storeBills(remote.bills); }
          this.onMerge(merged);
        } catch (err) {
          console.error("Sync merge failed", err);
        }
        this.pulling = false;
      },
      (err: unknown) => {
        console.error("Sync read failed", err);
        this.onState("error");
      },
    );

    return { ok: true, message: "Sync connected" };
  }

  disconnect() {
    if (this.ref) this.ref.off();
    this.ref = null;
    this.code = "";
    localStorage.removeItem(KEY.syncCode);
    this.onState("idle");
  }

  private lastPushed: Snapshot | null = null;

  /** Debounced: a burst of edits becomes one write. */
  push(snapshot: Snapshot | null) {
    if (snapshot) this.lastPushed = snapshot;
    const data = snapshot ?? this.lastPushed;
    if (!this.ref || this.pulling || !data) return;
    if (this.timer) clearTimeout(this.timer);
    this.onState("syncing");
    this.timer = window.setTimeout(() => {
      this.ref
        .set({ ...data, updatedAt: Date.now() })
        .then(() => this.onState("connected"))
        .catch((err: unknown) => {
          console.error("Sync push failed", err);
          this.onState("error");
        });
    }, 600);
  }
}

export const sync = new SyncClient();
