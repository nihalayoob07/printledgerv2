import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { XIcon } from "@phosphor-icons/react";

/** Everything that isn't the dashboard lives in one of these: a pane that
 *  rises out of the mesh, dims what's behind it, and gives focus somewhere
 *  sensible to land. Escape and a click on the backdrop both close it. */
export function Panel({ open, onClose, title, hint, actions, children, wide }: {
  open: boolean;
  onClose: () => void;
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const reduce = useReducedMotion();
  const body = useRef<HTMLDivElement>(null);
  const id = title.toLowerCase().replace(/\W+/g, "-");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => body.current?.focus(), 60);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(t); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${id}-title`}
          style={{ background: "rgb(20 12 28 / 0.32)", backdropFilter: "blur(6px)" }}
        >
          <motion.div
            className={`pane w-full ${wide ? "sm:max-w-[1040px]" : "sm:max-w-[620px]"}
                        h-[92dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col overflow-hidden
                        rounded-t-[30px] sm:rounded-[30px]`}
            style={{ boxShadow: "var(--cast-lift)" }}
            initial={reduce ? false : { y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <header className="shrink-0 flex items-start gap-3 px-6 pt-5 pb-4">
              <div className="min-w-0 flex-1">
                <h2 id={`${id}-title`}
                    className="font-display font-semibold text-[21px] tracking-[-0.025em]">
                  {title}
                </h2>
                {hint && <p className="text-[13px] text-ink3 mt-0.5">{hint}</p>}
              </div>
              {actions}
              <button
                onClick={onClose}
                aria-label={`Close ${title.toLowerCase()}`}
                className="shrink-0 grid place-items-center w-10 h-10 rounded-full text-ink2
                           transition-[background,transform] duration-200 hover:text-ink active:scale-[0.93]"
                style={{ background: "var(--veil)" }}
              >
                <XIcon size={17} aria-hidden />
              </button>
            </header>

            <div
              ref={body}
              tabIndex={-1}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-soft px-6
                         pb-[calc(1.5rem+env(safe-area-inset-bottom))] outline-none"
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
