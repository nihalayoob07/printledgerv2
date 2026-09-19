import type { Bill } from "./types";
import { currency, inr, locale } from "./pricing";
import { loadSettings } from "./storage";

function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** The canvas is sized from its contents, so the <img> needs the same maths
 *  to reserve the right box and avoid a layout shift while it decodes. */
export function billSize(bill: Bill) {
  const W = 720, rowH = 56;
  const headerH = bill.customer ? 230 : 160;
  const summaryH = bill.couponCode ? 190 : 140;
  return { W, H: headerH + bill.items.length * rowH + 40 + summaryH + 90 + 50 };
}

/** Renders the bill customers actually receive. Colours are pulled from the
 *  live theme so the image matches whichever colourway is on screen. */
export function renderBill(bill: Bill): string {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;

  const bg = v("--pane-solid", "#FFFDFC");
  const raised = v("--veil", "rgb(28 18 34 / 0.045)");
  const line = v("--edge-2", "rgb(28 18 34 / 0.08)");
  const ink = v("--ink", "#241A2B");
  const ink2 = v("--ink-2", "#4A3F55");
  const ink3 = v("--ink-3", "#6A5F75");
  const ink4 = v("--ink-4", "#8D8298");
  const good = v("--good", "#0F7A5A");
  const accent = v("--acc", "#7C3AED");

  const { items, subtotal, discount, total, customer } = bill;
  const coupon = bill.couponCode ? { code: bill.couponCode, percent: bill.couponPercent } : null;

  const { W, H } = billSize(bill);
  const padX = 40, rowH = 56, noteH = 90;

  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  let y = 44;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ink3;
  ctx.font = "600 11px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText((loadSettings().businessName || "Print Ledger").toUpperCase(), padX, y);
  y += 26;

  ctx.fillStyle = ink;
  ctx.font = "600 27px 'Outfit', sans-serif";
  ctx.fillText("Order Bill", padX, y);
  y += 20;

  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(W - padX, y); ctx.stroke();
  y += 30;

  if (customer) {
    ctx.fillStyle = ink3;
    ctx.font = "600 10px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText("BILLED TO", padX, y);
    y += 22;
    ctx.fillStyle = ink;
    ctx.font = "600 18px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(customer, padX, y);
    y += 74;
  }

  for (const item of items) {
    ctx.fillStyle = raised;
    roundRect(ctx, padX, y - 32, W - padX * 2, 46, 10);
    ctx.fill();

    ctx.fillStyle = ink;
    ctx.font = "600 14.5px 'Plus Jakarta Sans', sans-serif";
    const name = item.product || "Untitled";
    ctx.fillText(ctx.measureText(name).width > 380 ? name.slice(0, 34) + "…" : name, padX + 16, y - 6);

    ctx.font = "700 15px 'Plus Jakarta Sans', sans-serif";
    const price = inr(item.total);
    ctx.fillText(price, W - padX - 16 - ctx.measureText(price).width, y - 6);
    y += rowH;
  }

  y += 26;
  ctx.strokeStyle = line;
  ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(W - padX, y); ctx.stroke();
  y += 42;

  ctx.fillStyle = ink2;
  ctx.font = "500 13px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("Subtotal", padX, y);
  ctx.font = "600 13px 'Plus Jakarta Sans', sans-serif";
  const sub = inr(subtotal);
  ctx.fillText(sub, W - padX - ctx.measureText(sub).width, y);
  y += 36;

  if (coupon) {
    ctx.fillStyle = good;
    ctx.font = "500 13px 'Plus Jakarta Sans', sans-serif";
    ctx.fillText(`Coupon ${coupon.code.toUpperCase()} (${coupon.percent}% off)`, padX, y);
    ctx.font = "600 13px 'Plus Jakarta Sans', sans-serif";
    const off = "−" + inr(discount);
    ctx.fillText(off, W - padX - ctx.measureText(off).width, y);
    y += 44;
  } else {
    y += 14;
  }

  ctx.fillStyle = raised;
  roundRect(ctx, padX, y - 26, W - padX * 2, 52, 12);
  ctx.fill();

  ctx.fillStyle = ink;
  ctx.font = "700 15px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("TOTAL", padX + 18, y + 4);

  ctx.fillStyle = accent;
  ctx.font = "600 25px 'Outfit', sans-serif";
  const grand = currency() + Number(total).toLocaleString(locale(), { maximumFractionDigits: 2 });
  ctx.fillText(grand, W - padX - 18 - ctx.measureText(grand).width, y + 6);
  y += 56;

  ctx.fillStyle = raised;
  roundRect(ctx, padX, y, W - padX * 2, noteH - 20, 12);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = "600 14px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("Pay to confirm order", W / 2, y + 32);
  ctx.fillStyle = ink2;
  ctx.font = "500 12px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("Scan the attached QR to complete payment", W / 2, y + 52);
  y += noteH;

  ctx.fillStyle = ink4;
  ctx.font = "500 10.5px 'Plus Jakarta Sans', sans-serif";
  const when = new Date(bill.date);
  const stamp = (Number.isNaN(when.getTime()) ? new Date() : when).toLocaleDateString(locale(), {
    day: "2-digit", month: "short", year: "numeric",
  });
  ctx.fillText(`Generated ${stamp}`, W / 2, H - 20);
  ctx.textAlign = "left";

  return cv.toDataURL("image/png");
}
