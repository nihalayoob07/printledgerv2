import type { Bill, Coupon, Entry } from "./types";
import { findCoupon } from "./pricing";

/** A bill's coupon is carried on the prints it covers, so the ledger reports
 *  what was actually collected instead of the list price. Kept as a field on
 *  the entry (rather than recomputed) so a deleted bill can cleanly reverse. */
export function applyBillToEntries(bill: Bill, log: Entry[]): Entry[] {
  return log.map((e) => {
    const covered = bill.items.some((i) => i.id === e.id);
    if (!covered) return e;
    return {
      ...e,
      billId: bill.id,
      billDiscount: bill.couponPercent ? (e.total || 0) * (bill.couponPercent / 100) : 0,
    };
  });
}

export function clearBillFromEntries(billId: string, log: Entry[]): Entry[] {
  return log.map((e) => (e.billId === billId ? { ...e, billId: "", billDiscount: 0 } : e));
}

export function billTotals(items: Entry[], couponCode: string, coupons: Coupon[]) {
  const subtotal = items.reduce((s, e) => s + (e.total || 0), 0);
  const coupon = findCoupon(coupons, couponCode);
  const discount = coupon ? subtotal * (coupon.percent / 100) : 0;
  return { subtotal, coupon, discount, grandTotal: subtotal - discount };
}

/** Prints that may go on this bill. Anything already covered by a different
 *  bill is excluded, so a print can never take two discounts. */
export function billCandidates(log: Entry[], editingBillId: string | null, query: string) {
  const q = query.trim().toLowerCase();
  return log.filter((e) => {
    if (e.type === "Freebie" || (e.total || 0) <= 0) return false;
    if (e.billId && e.billId !== editingBillId) return false;
    if (!q) return true;
    return (
      (e.product || "").toLowerCase().includes(q) ||
      (e.customer || "").toLowerCase().includes(q)
    );
  });
}

export function makeBill(
  existing: Bill | null,
  customer: string,
  items: Entry[],
  couponCode: string,
  coupons: Coupon[],
): Bill {
  const { subtotal, coupon, discount, grandTotal } = billTotals(items, couponCode, coupons);
  return {
    id: existing?.id ?? "bill" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    date: existing?.date ?? new Date().toISOString(),
    customer: customer.trim(),
    couponCode: coupon ? coupon.code.toUpperCase() : "",
    couponPercent: coupon ? coupon.percent : 0,
    items: items.map((e) => ({ id: e.id, product: e.product || "Untitled", total: e.total || 0 })),
    subtotal,
    discount,
    total: grandTotal,
  };
}
