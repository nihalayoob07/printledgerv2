import type { Bill, Coupon, Entry, Settings } from "./types";
import { DEFAULT_SETTINGS } from "./storage";

/** A whole-shop snapshot. Everything the app knows, in one file you can keep
 *  somewhere that is not a browser. */
export interface Backup {
  app: "print-ledger";
  version: 1;
  exportedAt: string;
  settings: Settings;
  log: Entry[];
  coupons: Coupon[];
  bills: Bill[];
}

export const makeBackup = (
  settings: Settings, log: Entry[], coupons: Coupon[], bills: Bill[],
): Backup => ({
  app: "print-ledger",
  version: 1,
  exportedAt: new Date().toISOString(),
  settings, log, coupons, bills,
});

export function downloadBackup(b: Backup) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(b, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `print-ledger-backup-${b.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Restoring replaces everything, so this is strict on purpose: a file that is
 *  not clearly one of ours is rejected rather than half-applied. */
export function parseBackup(text: string): Backup | null {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return null; }
  const b = data as Partial<Backup>;
  if (!b || b.app !== "print-ledger") return null;
  if (!Array.isArray(b.log) || !Array.isArray(b.bills) || !Array.isArray(b.coupons)) return null;
  if (!b.settings || typeof b.settings !== "object") return null;
  return {
    app: "print-ledger",
    version: 1,
    exportedAt: typeof b.exportedAt === "string" ? b.exportedAt : new Date().toISOString(),
    // an older backup may predate fields that exist now
    settings: { ...DEFAULT_SETTINGS, ...b.settings },
    log: b.log as Entry[],
    coupons: b.coupons as Coupon[],
    bills: b.bills as Bill[],
  };
}
