import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckIcon, CopyIcon, DownloadSimpleIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import type { Bill, Coupon, Entry, FirebaseConfig, Settings, SyncState, ThemeId } from "../domain/types";
import { parseFirebaseConfig } from "../domain/storage";
import { generateCode } from "../domain/sync";
import { downloadBackup, makeBackup, parseBackup, type Backup } from "../domain/backup";
import { MOODS } from "../state/store";
import { Panel } from "./Panel";
import { Field, Input, Primary, Quiet } from "./ui";

type RateKey = "filamentCostPerKg" | "printerWatts" | "electricityRate"
  | "labourRate" | "packagingCost" | "profitPercent";

const rateFields = (cur: string): { key: RateKey; label: string; unit: string; step: number }[] => [
  { key: "filamentCostPerKg", label: "Filament", unit: `${cur}/kg`, step: 10 },
  { key: "printerWatts", label: "Printer draw", unit: "W", step: 1 },
  { key: "electricityRate", label: "Electricity", unit: `${cur}/kWh`, step: 0.1 },
  { key: "labourRate", label: "Your time", unit: `${cur}/hr`, step: 1 },
  { key: "packagingCost", label: "Packaging", unit: cur, step: 1 },
  { key: "profitPercent", label: "Margin", unit: "%", step: 1 },
];

export function SettingsPanel(props: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSaveSettings: (s: Settings) => void;
  coupons: Coupon[];
  onSaveCoupons: (c: Coupon[]) => void;
  theme: ThemeId;
  onTheme: (t: ThemeId) => void;
  syncState: SyncState;
  syncCode: string;
  onConnect: (code: string) => void;
  onDisconnect: () => void;
  firebase: FirebaseConfig | null;
  onFirebase: (c: FirebaseConfig | null) => void;
  log: Entry[];
  bills: Bill[];
  onRestore: (b: Backup) => void;
  toast: (msg: string) => void;
}) {
  const {
    open, onClose, settings, onSaveSettings, coupons, onSaveCoupons,
    theme, onTheme, syncState, syncCode, onConnect, onDisconnect, firebase, onFirebase,
    log, bills, onRestore, toast,
  } = props;
  const reduce = useReducedMotion();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [codeInput, setCodeInput] = useState(syncCode);
  const [vault, setVault] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newPct, setNewPct] = useState("");
  const [brand, setBrand] = useState(settings.businessName);
  const [cur, setCur] = useState(settings.currency);
  const [loc, setLoc] = useState(settings.locale);
  const [fbText, setFbText] = useState("");
  const [pending, setPending] = useState<Backup | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const RATES = rateFields(settings.currency);

  useEffect(() => {
    if (!open) return;
    setDraft(Object.fromEntries(rateFields("").map((r) => [r.key, String(settings[r.key])])));
    setCodeInput(syncCode);
    setBrand(settings.businessName);
    setCur(settings.currency);
    setLoc(settings.locale);
    setFbText("");
    setPending(null);
  }, [open, settings, syncCode]);

  const saveRates = () => {
    onSaveSettings({
      ...settings,
      ...Object.fromEntries(rateFields("").map((r) => [r.key, parseFloat(draft[r.key]) || 0])),
    } as Settings);
    toast("Rates saved");
  };

  const saveBrand = () => {
    onSaveSettings({
      ...settings,
      businessName: brand.trim() || "Print Ledger",
      currency: cur.trim() || "₹",
      locale: loc.trim() || "en-IN",
    });
    toast("Saved");
  };

  const saveFirebase = () => {
    const parsed = parseFirebaseConfig(fbText);
    if (!parsed) { toast("That does not look like a Firebase config"); return; }
    onFirebase(parsed);
    setFbText("");
    toast("Firebase project saved. Now set a sync code.");
  };

  const addCoupon = () => {
    const code = newCode.trim().toUpperCase();
    const pct = parseFloat(newPct);
    if (!code || Number.isNaN(pct) || pct <= 0) { toast("Needs a code and a percentage"); return; }
    const next = [...coupons];
    const i = next.findIndex((c) => c.code.toUpperCase() === code);
    if (i === -1) next.push({ code, percent: pct }); else next[i] = { code, percent: pct };
    onSaveCoupons(next);
    setNewCode(""); setNewPct("");
    toast(`${code} saved`);
  };

  const lamp = syncState === "unconfigured" ? "var(--ink-4)"
    : syncState === "connected" ? "var(--good)"
    : syncState === "syncing" ? "var(--acc)"
    : syncState === "error" ? "var(--bad)" : "var(--ink-4)";

  return (
    <Panel open={open} onClose={onClose} title="Settings" hint="Your rates, your mood, your devices">
      <Section title="Mood" note="Changes the light behind everything.">
        <div className="flex gap-2.5 overflow-x-auto no-bar pb-1" role="group" aria-label="Mood">
          {MOODS.map((m) => {
            const on = theme === m.id;
            return (
              <button
                key={m.id}
                aria-pressed={on}
                onClick={() => onTheme(m.id)}
                className="group shrink-0 w-[92px] rounded-3xl p-2 text-center
                           transition-[background,transform] duration-200 hover:-translate-y-0.5"
                style={{ background: on ? "var(--acc-soft)" : "var(--veil)" }}
              >
                <span
                  aria-hidden
                  className="relative grid place-items-center w-full h-[58px] rounded-2xl mb-2 overflow-hidden"
                  style={{ background: m.swatch }}
                >
                  <AnimatePresence>
                    {on && (
                      <motion.span
                        initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 520, damping: 26 }}
                        className="grid place-items-center w-6 h-6 rounded-full"
                        style={{ background: "rgb(255 255 255 / 0.9)" }}
                      >
                        <CheckIcon size={13} weight="bold" color="#1c1226" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className={`block text-[12px] font-medium ${on ? "text-acc" : "text-ink2"}`}>
                  {m.name}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Your business" note="Your name goes in the header and on every bill you hand out.">
        <Field label="Business name" htmlFor="brand-name">
          <Input id="brand-name" value={brand} onChange={setBrand}
                 placeholder="The Print Vault…" autoComplete="organization" />
        </Field>
        <div className="grid grid-cols-[minmax(0,90px)_minmax(0,1fr)] gap-3">
          <Field label="Currency" htmlFor="brand-currency">
            <Input id="brand-currency" value={cur} onChange={setCur}
                   placeholder="₹" autoComplete="off" spellCheck={false} maxLength={3} />
          </Field>
          <Field
            label="Number and date format"
            htmlFor="brand-locale"
            hint={<p className="text-[12.5px] text-ink3 mt-1.5">
              A language tag. en-IN gives 1,00,000 and 19 Sept; en-US gives 100,000 and Sep 19.
            </p>}
          >
            <Input id="brand-locale" value={loc} onChange={setLoc}
                   placeholder="en-IN" autoComplete="off" spellCheck={false} />
          </Field>
        </div>
        <Primary onClick={saveBrand} className="w-full mt-2">Save</Primary>
      </Section>

      <Section title="What it costs you" note="These feed every quote. Every figure is per your own machine and tariff, so set them before you price anything.">
        <div className="grid sm:grid-cols-2 gap-x-4 min-w-0">
          {RATES.map((r) => (
            <Field key={r.key} label={r.label} htmlFor={`rate-${r.key}`}>
              <Input id={`rate-${r.key}`} unit={r.unit} type="number" inputMode="decimal"
                     min={0} step={r.step} autoComplete="off"
                     value={draft[r.key] ?? ""}
                     onChange={(v) => setDraft((d) => ({ ...d, [r.key]: v }))} />
            </Field>
          ))}
        </div>
        <Primary onClick={saveRates} className="w-full mt-2">Save these rates</Primary>
      </Section>

      <Section
        title="Sync across devices"
        note="Optional. Everything works on this device without it. To sync, connect your own Firebase project so your data stays yours."
        badge={<i aria-hidden className="w-2 h-2 rounded-full block" style={{ background: lamp }} />}
      >
        {!firebase ? (
          <>
            <Field
              label="Firebase config"
              htmlFor="fb-config"
              hint={<p className="text-[12.5px] text-ink3 mt-1.5 leading-relaxed">
                Make a free Firebase project, add a Realtime Database, then paste the
                config snippet from Project settings. The README has the database rules
                to set, and they matter.
              </p>}
            >
              <textarea
                id="fb-config"
                name="fb-config"
                value={fbText}
                onChange={(e) => setFbText(e.target.value)}
                rows={5}
                spellCheck={false}
                autoComplete="off"
                placeholder={'{ "apiKey": "…", "databaseURL": "https://….firebasedatabase.app" }'}
                className="w-full rounded-2xl border px-4 py-3 text-[13px] outline-none resize-y
                           transition-[border-color,box-shadow] duration-200
                           focus:border-acc focus:shadow-[0_0_0_4px_var(--acc-soft)] placeholder:text-ink4"
                style={{ background: "var(--veil)", borderColor: "var(--edge-2)" }}
              />
            </Field>
            <Primary onClick={saveFirebase} className="w-full">Connect a project</Primary>
          </>
        ) : (
          <>
            {syncCode && syncCode.length < 16 && (
              <p className="rounded-2xl px-4 py-3 mb-3 text-[12.5px] leading-relaxed"
                 style={{ background: "var(--bad-soft)", color: "var(--bad)" }}>
                Your saved code is too short to be safe and no longer connects.
                Tap Generate, connect, then put the new code on your other devices.
              </p>
            )}
            <Field
              label="Sync code"
              htmlFor="sync-code"
              hint={<p className="text-[12.5px] text-ink3 mt-1.5 leading-relaxed">
                This code is the only thing protecting your data. Use the generated one,
                and put the same code on your other devices.
              </p>}
            >
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <Input id="sync-code" value={codeInput} onChange={setCodeInput}
                         placeholder="A long random code…" autoComplete="off"
                         spellCheck={false} autoCapitalize="characters" />
                </div>
                <Quiet onClick={() => { setCodeInput(generateCode()); toast("Generated. Connect to use it."); }}>
                  Generate
                </Quiet>
                {/* nobody should have to hand-type 24 characters onto a phone */}
                <Quiet
                  onClick={async () => {
                    if (!codeInput.trim()) { toast("Nothing to copy yet"); return; }
                    try {
                      await navigator.clipboard.writeText(codeInput.trim());
                      toast("Code copied");
                    } catch {
                      toast("Copy blocked here. Select the code and copy it.");
                    }
                  }}
                >
                  <CopyIcon size={14} aria-hidden /> Copy
                </Quiet>
              </div>
            </Field>
            <div className="flex gap-2">
              <Primary onClick={() => onConnect(codeInput)} className="flex-1">
                {syncCode ? "Reconnect" : "Connect"}
              </Primary>
              {syncCode && <Quiet tone="bad" onClick={onDisconnect}>Disconnect</Quiet>}
            </div>
            <button
              onClick={() => { onFirebase(null); toast("Firebase project removed"); }}
              className="w-full mt-2 rounded-full py-2.5 text-[12.5px] font-medium text-ink3 hover:text-bad transition-colors"
            >
              Use a different Firebase project
            </button>
          </>
        )}
      </Section>

      <Section
        title="Your data"
        note="Everything lives in this browser. Keep a backup somewhere that is not a browser, and use it to move to a new device or a new Firebase project."
      >
        <div className="flex gap-2 flex-wrap">
          <Quiet onClick={() => {
            downloadBackup(makeBackup(settings, log, coupons, bills));
            toast(`Backed up ${log.length} print${log.length === 1 ? "" : "s"}`);
          }}>
            <DownloadSimpleIcon size={14} aria-hidden /> Download a backup
          </Quiet>
          <Quiet onClick={() => fileRef.current?.click()}>
            <UploadSimpleIcon size={14} aria-hidden /> Restore from a backup
          </Quiet>
        </div>

        <label className="sr-only" htmlFor="restore-file">Backup file</label>
        <input
          id="restore-file"
          name="restore-file"
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const parsed = parseBackup(await f.text());
            if (!parsed) { toast("That is not a Print Ledger backup"); return; }
            setPending(parsed);
          }}
        />

        {/* restoring throws away everything currently here, so it asks first */}
        <AnimatePresence initial={false}>
          {pending && (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reduce ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl px-4 py-3.5 mt-3" style={{ background: "var(--bad-soft)" }}>
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--bad)" }}>
                  This replaces everything on this device with the backup:{" "}
                  <b>{pending.log.length} print{pending.log.length === 1 ? "" : "s"}</b> and{" "}
                  <b>{pending.bills.length} bill{pending.bills.length === 1 ? "" : "s"}</b>, saved{" "}
                  {new Date(pending.exportedAt).toLocaleDateString(settings.locale, {
                    day: "numeric", month: "short", year: "numeric" })}.
                  You currently have {log.length} and {bills.length}.
                </p>
                <div className="flex gap-2 mt-3">
                  <Quiet tone="bad" onClick={() => {
                    onRestore(pending);
                    setPending(null);
                    toast(`Restored ${pending.log.length} print${pending.log.length === 1 ? "" : "s"}`);
                  }}>
                    Replace everything
                  </Quiet>
                  <Quiet onClick={() => setPending(null)}>Keep what I have</Quiet>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      <div className="h-px my-6" style={{ background: "var(--edge-2)" }} />

      <button
        onClick={() => setVault((v) => !v)}
        aria-expanded={vault}
        className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left
                   transition-[background] duration-200 hover:bg-veil"
      >
        <span>
          <span className="block text-[14px] font-medium">Discount codes</span>
          <span className="block text-[12px] text-ink3 mt-0.5">
            {coupons.length} saved · type one into a quote to apply it
          </span>
        </span>
        <span aria-hidden className={`text-ink3 transition-transform duration-300 ${vault ? "rotate-45" : ""}`}>
          +
        </span>
      </button>

      <AnimatePresence initial={false}>
        {vault && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {coupons.length === 0
                ? <p className="text-[13px] text-ink3 px-1 pb-2">None yet.</p>
                : coupons.map((c, i) => (
                  <div key={c.code}
                       className="flex items-center gap-3 rounded-2xl px-4 py-2.5 mb-1.5"
                       style={{ background: "var(--veil)" }}>
                    <span className="flex-1 min-w-0">
                      <b className="text-[14px] font-semibold">{c.code.toUpperCase()}</b>
                      <span className="text-[12.5px] text-ink3 ml-2">{c.percent}% off</span>
                    </span>
                    <button
                      aria-label={`Delete ${c.code}`}
                      onClick={() => onSaveCoupons(coupons.filter((_, j) => j !== i))}
                      className="grid place-items-center w-9 h-9 rounded-full text-ink3
                                 transition-colors duration-200 hover:text-bad hover:bg-bad-soft"
                    >
                      <TrashIcon size={15} aria-hidden />
                    </button>
                  </div>
                ))}

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,90px)] gap-3 mt-3">
                <Field label="Code" htmlFor="new-code">
                  <Input id="new-code" value={newCode} onChange={setNewCode}
                         placeholder="DIWALI…" autoComplete="off" spellCheck={false} autoCapitalize="characters" />
                </Field>
                <Field label="Off" htmlFor="new-pct">
                  <Input id="new-pct" unit="%" type="number" inputMode="decimal" min={0} max={100} step={1}
                         value={newPct} onChange={setNewPct} placeholder="0" autoComplete="off" />
                </Field>
              </div>
              <Quiet onClick={addCoupon} className="w-full">Add this code</Quiet>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

function Section({ title, note, badge, children }: {
  title: string; note?: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="mb-7 last:mb-0">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-display font-semibold text-[15px] tracking-[-0.015em]">{title}</h3>
        {badge}
      </div>
      {note && <p className="text-[12.5px] text-ink3 leading-relaxed mb-3.5 max-w-[46ch]">{note}</p>}
      {children}
    </section>
  );
}
