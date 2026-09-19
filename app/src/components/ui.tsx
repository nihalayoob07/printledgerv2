import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { currency } from "../domain/pricing";

/* ── glass pane ─────────────────────────────────────────────────────── */

export function Card({ children, className = "", span = "", delay = 0, id }: {
  children: ReactNode; className?: string; span?: string; delay?: number; id?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      className={`pane rounded-[26px] min-w-0 ${span} ${className}`}
      initial={reduce ? false : { opacity: 0, y: 22, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 210, damping: 26, delay: reduce ? 0 : delay }}
    >
      {children}
    </motion.section>
  );
}

export function CardHead({ title, hint, action }: {
  title: string; hint?: string; action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-1">
      <div className="min-w-0">
        <h2 className="font-display font-semibold text-[15.5px] tracking-[-0.015em] text-ink">{title}</h2>
        {hint && <p className="text-[12.5px] text-ink3 mt-0.5 leading-snug">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── controls ───────────────────────────────────────────────────────── */

export function Field({ label, htmlFor, children, hint }: {
  label: string; htmlFor: string; children: ReactNode; hint?: ReactNode;
}) {
  return (
    <div className="mb-3.5 last:mb-0 min-w-0">
      <label htmlFor={htmlFor} className="block text-[12.5px] font-medium text-ink2 mb-1.5">
        {label}
      </label>
      {children}
      {hint}
    </div>
  );
}

export function Input({ id, value, onChange, unit, big, ...rest }: {
  id: string; value: string; onChange: (v: string) => void; unit?: string; big?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id" | "size">) {
  return (
    <div
      className="flex items-center rounded-2xl border transition-[border-color,box-shadow,background] duration-200
                 focus-within:border-acc focus-within:shadow-[0_0_0_4px_var(--acc-soft)]"
      style={{ background: "var(--veil)", borderColor: "var(--edge-2)" }}
    >
      <input
        id={id}
        name={id}
        size={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 min-w-0 bg-transparent outline-none px-4 ${
          big ? "py-3.5 text-[19px] font-display font-semibold tnum" : "py-3 text-[15px]"
        } placeholder:text-ink4`}
        {...rest}
      />
      {unit && (
        <span className="pr-4 pl-1 text-[13px] text-ink2 font-medium select-none">{unit}</span>
      )}
    </div>
  );
}

export function Chips({ options, onPick }: {
  options: { label: string; amount: number }[]; onPick: (n: number) => void;
}) {
  return (
    <div className="flex gap-1.5 mt-2">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onPick(o.amount)}
          className="flex-1 min-w-0 rounded-full py-2 text-[12.5px] font-medium text-ink2
                     transition-[background,color,transform] duration-200
                     hover:text-ink active:scale-[0.94]"
          style={{ background: "var(--veil)" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, note, tone = "acc" }: {
  checked: boolean; onChange: () => void; label: string; note?: string; tone?: "acc" | "bad";
}) {
  const reduce = useReducedMotion();
  const fill = tone === "bad" ? "var(--bad)" : "var(--acc)";
  return (
    /* the whole row is the control, so the label is part of the hit target
       and supplies the accessible name */
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="w-full flex items-center justify-between gap-4 py-2.5 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[14px] text-ink">{label}</span>
        {note && <span className="block text-[12px] text-ink3 mt-0.5">{note}</span>}
      </span>
      <span
        aria-hidden
        className="relative w-[46px] h-[27px] shrink-0 rounded-full block transition-[background] duration-250"
        style={{ background: checked ? fill : "var(--edge-2)" }}
      >
        <motion.i
          className="absolute top-[3px] left-[3px] w-[21px] h-[21px] rounded-full block bg-white"
          style={{ boxShadow: "0 2px 6px rgb(0 0 0 / 0.22)" }}
          animate={{ x: checked ? 19 : 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 560, damping: 34 }}
        />
      </span>
    </button>
  );
}

/* ── buttons ────────────────────────────────────────────────────────── */

export function Primary({ children, className = "", ...rest }: {
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      whileTap={reduce || rest.disabled ? undefined : { scale: 0.975 }}
      className={`relative overflow-hidden rounded-full px-6 py-3.5 font-display font-semibold
                  text-[14.5px] tracking-[-0.01em] transition-[filter,opacity] duration-200
                  hover:brightness-[1.07] disabled:cursor-not-allowed ${className}`}
      style={{
        background: rest.disabled
          ? "var(--edge-2)"
          : "linear-gradient(135deg, var(--acc), var(--acc-2))",
        color: rest.disabled ? "var(--ink-4)" : "var(--acc-ink)",
        boxShadow: rest.disabled ? "none" : "0 10px 26px -10px var(--glow)",
      }}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  );
}

export function Quiet({ children, tone, className = "", ...rest }: {
  children: ReactNode; tone?: "bad";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5
                  text-[13px] font-medium transition-[background,color] duration-200
                  ${tone === "bad" ? "text-bad hover:bg-bad-soft" : "text-ink2 hover:text-ink"} ${className}`}
      style={tone === "bad" ? undefined : { background: "var(--veil)" }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", ...rest }: {
  label: string; children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label={label}
      className={`grid place-items-center w-11 h-11 rounded-full text-ink2
                  transition-[background,color,transform] duration-200
                  hover:text-ink active:scale-[0.93] ${className}`}
      style={{ background: "var(--veil)" }}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ── small pieces ───────────────────────────────────────────────────── */

export function Pill({ children, tone = "ink" }: { children: ReactNode; tone?: "ink" | "acc" | "good" | "bad" }) {
  const map = {
    ink: { color: "var(--ink-2)", background: "var(--veil)" },
    acc: { color: "var(--acc)", background: "var(--acc-soft)" },
    good: { color: "var(--good)", background: "var(--good-soft)" },
    bad: { color: "var(--bad)", background: "var(--bad-soft)" },
  }[tone];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold"
          style={map}>
      {children}
    </span>
  );
}

export function Money({ value, size = 34, tone }: { value: string; size?: number; tone?: string }) {
  return (
    <p className="font-display font-semibold tnum leading-none tracking-[-0.035em] flex items-baseline gap-[0.12em]"
       style={{ fontSize: size, color: tone }}>
      <span style={{ fontSize: size * 0.5, opacity: 0.45 }}>{currency()}</span>
      <span>{value}</span>
    </p>
  );
}
