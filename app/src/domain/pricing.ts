import type { Coupon, Draft, Entry, Quote, Settings } from "./types";

/** Set once from settings before anything renders, so the hundreds of call
 *  sites below do not each have to be handed the settings object. */
let MONEY = { symbol: "₹", locale: "en-IN" };
export const setMoneyFormat = (symbol: string, locale: string) => {
  MONEY = { symbol: symbol || "₹", locale: locale || "en-IN" };
};
export const currency = () => MONEY.symbol;
export const locale = () => MONEY.locale;

export const inr = (n: number) => MONEY.symbol + Math.round(n).toLocaleString(MONEY.locale);
export const inrExact = (n: number) =>
  Number(n).toLocaleString(MONEY.locale, { maximumFractionDigits: 2 });

export function findCoupon(coupons: Coupon[], code: string): Coupon | null {
  const wanted = (code || "").trim().toUpperCase();
  if (!wanted) return null;
  return coupons.find((c) => c.code.toUpperCase() === wanted) ?? null;
}

/** The quote. Order matters: coupon comes off the marked-up total, a manual
 *  override replaces it outright, and a freebie zeroes everything. */
export function quote(draft: Draft, settings: Settings, coupons: Coupon[]): Quote {
  const w = parseFloat(draft.weight) || 0;
  const t = parseFloat(draft.time) || 0;

  const filamentCost = (w / 1000) * settings.filamentCostPerKg;
  const powerCost = (settings.printerWatts / 1000) * t * settings.electricityRate;
  const labourCost = t * settings.labourRate;
  const packagingCost = draft.packaging ? settings.packagingCost || 0 : 0;

  const subtotal = filamentCost + powerCost + labourCost + packagingCost;
  const profitCost = subtotal * (settings.profitPercent / 100);
  let total = subtotal + profitCost;

  const coupon = findCoupon(coupons, draft.coupon);
  let discount = 0;
  if (coupon) {
    discount = total * (coupon.percent / 100);
    total -= discount;
  }
  if (draft.override !== null && !Number.isNaN(draft.override)) total = draft.override;
  if (draft.freebie) total = 0;

  return { filamentCost, powerCost, labourCost, packagingCost, profitCost, discount, coupon, total };
}

/** What the customer actually paid, after any bill-level discount. */
export const netTotal = (e: Entry) => (e.total || 0) - (e.billDiscount || 0);
export const costOf = (e: Entry) =>
  (e.filamentCost || 0) + (e.powerCost || 0) + (e.labourCost || 0) + (e.packagingCost || 0);
export const profitOf = (e: Entry) => netTotal(e) - costOf(e);

export function newEntry(draft: Draft, q: Quote): Entry {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    date: new Date().toISOString(),
    product: draft.product.trim(),
    customer: draft.customer.trim(),
    weight: parseFloat(draft.weight) || 0,
    time: parseFloat(draft.time) || 0,
    filamentCost: q.filamentCost,
    powerCost: q.powerCost,
    labourCost: q.labourCost,
    packagingCost: q.packagingCost,
    profitCost: q.profitCost,
    couponCode: q.coupon ? q.coupon.code.toUpperCase() : "",
    couponPercent: q.coupon ? q.coupon.percent : 0,
    discount: q.discount || 0,
    total: q.total,
    type: draft.freebie ? "Freebie" : "Sale",
    paid: draft.freebie ? true : false,
    printDone: false,
  };
}

export const emptyDraft = (): Draft => ({
  product: "",
  customer: "",
  weight: "",
  time: "",
  coupon: "",
  packaging: false,
  freebie: false,
  override: null,
});

/** Shape of the object drawn on the build plate: material sets the footprint,
 *  run time sets how many layers get stacked. */
export function plateGeometry(weight: number, time: number) {
  const layers = Math.max(0, Math.min(20, Math.round(time * 2.6)));
  const radius = weight > 0 ? Math.max(26, Math.min(132, 26 + Math.sqrt(weight) * 7.2)) : 0;
  return { layers, radius };
}
