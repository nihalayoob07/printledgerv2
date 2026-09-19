export type ThemeId = "dawn" | "lagoon" | "blossom" | "iris" | "eclipse";

export interface Settings {
  /** shown in the header and printed on every bill */
  businessName: string;
  /** currency symbol, e.g. "₹", "$", "€" */
  currency: string;
  /** BCP-47 tag used to format money and dates, e.g. "en-IN", "en-US" */
  locale: string;
  filamentCostPerKg: number;
  printerWatts: number;
  electricityRate: number;
  labourRate: number;
  packagingCost: number;
  profitPercent: number;
}

export interface Coupon {
  code: string;
  percent: number;
}

/** A logged print. Field names are load-bearing: they are what is already
 *  stored in localStorage and in the Firebase sync payload. */
export interface Entry {
  id: string;
  date: string;
  product: string;
  customer: string;
  weight: number;
  time: number;
  filamentCost: number;
  powerCost: number;
  labourCost: number;
  packagingCost: number;
  profitCost: number;
  couponCode: string;
  couponPercent: number;
  discount: number;
  total: number;
  type: "Sale" | "Freebie";
  paid: boolean;
  printDone: boolean;
  /** set when the print is covered by a bill */
  billId?: string;
  /** rupees taken off this print by that bill's coupon */
  billDiscount?: number;
}

export interface BillItem {
  id: string;
  product: string;
  total: number;
}

export interface Bill {
  id: string;
  date: string;
  customer: string;
  couponCode: string;
  couponPercent: number;
  items: BillItem[];
  subtotal: number;
  discount: number;
  total: number;
}

export interface Draft {
  product: string;
  customer: string;
  weight: string;
  time: string;
  coupon: string;
  packaging: boolean;
  freebie: boolean;
  override: number | null;
}

export interface Quote {
  filamentCost: number;
  powerCost: number;
  labourCost: number;
  packagingCost: number;
  profitCost: number;
  discount: number;
  coupon: Coupon | null;
  total: number;
}

export type SyncState = "idle" | "connected" | "syncing" | "error" | "unconfigured";

/** Whatever the Firebase console hands you. Supplied by the operator, never
 *  shipped in the source: every business syncs through its own project. */
export interface FirebaseConfig {
  apiKey: string;
  databaseURL: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}
