import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export interface ToastMsg {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

/** One slot, floating clear of the bottom edge. Polite, so it never cuts a
 *  screen reader off mid-field. */
export function Toast({ msg, onClose }: { msg: ToastMsg | null; onClose: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4
                 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      <AnimatePresence>
        {msg && (
          <motion.div
            key={msg.id}
            initial={reduce ? false : { y: 18, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 12, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pane pointer-events-auto flex items-center gap-3 max-w-[min(460px,100%)]
                       rounded-full pl-5 pr-2 py-2"
            style={{ boxShadow: "var(--cast-lift)" }}
          >
            <span className="min-w-0 truncate text-[13.5px] text-ink py-1">{msg.text}</span>
            {msg.action && (
              <button
                onClick={() => { msg.action!.run(); onClose(); }}
                className="shrink-0 rounded-full px-4 py-2 text-[12.5px] font-semibold
                           transition-transform duration-200 active:scale-[0.94]"
                style={{ background: "var(--acc)", color: "var(--acc-ink)" }}
              >
                {msg.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
