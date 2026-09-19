import type { Entry } from "./types";
import { netTotal } from "./pricing";

const round2 = (n: number) => Math.round(((n || 0) + Number.EPSILON) * 100) / 100;

const cell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

/** Column set matches what has already been exported before, plus the
 *  list-price / bill-discount split introduced with bills. */
export function toCsv(log: Entry[]): string {
  const headers = [
    "Date", "Product", "Customer", "Filament(g)", "Time(hrs)",
    "FilamentCost", "PowerCost", "LabourCost", "PackagingCost", "ProfitCost",
    "ListPrice", "BillDiscount", "Total",
  ];
  const rows = log.map((e) => [
    e.date, e.product, e.customer, e.weight, e.time,
    round2(e.filamentCost), round2(e.powerCost), round2(e.labourCost),
    round2(e.packagingCost), round2(e.profitCost),
    round2(e.total), round2(e.billDiscount || 0), round2(netTotal(e)),
  ]);
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\n");
}

export function downloadCsv(log: Entry[]) {
  const url = URL.createObjectURL(new Blob([toCsv(log)], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "print-ledger-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
