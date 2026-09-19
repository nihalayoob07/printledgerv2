# Print Ledger

A pricing calculator and sales ledger for a small 3D-printing business.

Work out what a print actually costs you, quote it, log the sale, and hand the
customer a bill. It is one HTML file. Download it, open it, use it. No account,
no server, no subscription, and nothing leaves your machine unless you decide
otherwise.

Built for a small print shop, and released because the same
spreadsheet-and-guesswork problem shows up in all of them.

## Get started

Download `index.html` and open it. That is the whole install.

Then go to **Settings** and do two things before you quote anything:

1. **Your business.** Your name, your currency, and a language tag for number
   and date formatting. `en-IN` gives you `1,00,000` and `19 Sept`; `en-US`
   gives you `100,000` and `Sep 19`. Any [BCP-47 tag](https://www.techonthenet.com/js/language_tags.php)
   works.
2. **What it costs you.** Filament price per kg, your printer's draw in watts,
   your electricity tariff, what you value your own time at, packaging, and the
   margin you want. The defaults are one shop's numbers, not yours. A quote is
   only as honest as these six figures.

## What it does

**Quoting.** Material cost, electricity from wattage and run time, your labour,
packaging, then your margin on top. A discount code comes off the marked-up
total. You can override any quote with a price you actually agreed, or zero it
as a giveaway and still keep the record.

**The ledger.** Every logged print, searchable and sortable, with what it cost
to make and what you actually cleared. Mark things paid and printed. Reprice an
old job by loading it back into the quote. Export the lot to CSV.

**Bills.** Group finished prints into one bill, apply a discount to the whole
thing, and get a PNG to send the customer. The discount is carried back onto
the prints it covers, so the ledger reports what you collected rather than list
price. Delete a bill and the discount is reversed.

**Moods.** Five of them, one dark. It remembers which you picked and follows
your system preference until you do.

## Syncing between devices, if you want it

Sync is off by default and the app is complete without it. Turn it on and your
phone and your desktop stay in step.

It runs on **your own** Firebase project, not a shared one. Your data never
touches anybody else's infrastructure, including mine.

1. Create a free project at [console.firebase.google.com](https://console.firebase.google.com).
2. Build → **Realtime Database** → Create Database.
3. Project settings → Your apps → Web → copy the config snippet.
4. Paste the whole snippet into **Settings → Sync across devices**.
5. Press **Generate** for a sync code, then **Connect**. Put the same code into
   the app on your other device.

### Set the database rules. This part matters.

The sync code is the only credential. Leave the database in test mode and
anyone who finds your project URL can read and write everything in it.

Realtime Database → Rules:

```json
{
  "rules": {
    "syncedUsers": {
      "$code": {
        ".read": "$code.length >= 20",
        ".write": "$code.length >= 20 && newData.hasChild('settings')"
      }
    }
  }
}
```

This means: your data lives under a long random code that acts as the key, and
short or guessable codes are refused outright. The write also has to carry a
settings object, which rules out junk being dumped at a guessed path.

Use the generated code. Do not shorten it, do not use your business name, and
treat it like a password, because that is what it is. The app refuses anything
under 16 characters.

Do not tighten the rule into `newData.hasChildren(['settings', 'log'])`. The
Realtime Database drops empty arrays rather than storing them, so a shop that
has not logged a print yet has no `log` key, and every write would be rejected.

Honest about the limits: anyone who has the code has full access, there is no
per-user login, and there is no audit trail. That is the right trade for a
one-person shop syncing two devices. If you have staff, or customer data you
are legally on the hook for, put Firebase Authentication in front of it.

### Changing a code you already use

Rotating a code moves your data to a new path, so do it in this order or you
will lock yourself out:

1. On the device with the most complete data, **Generate**, then **Connect**.
   The database has nothing at the new path, so this device uploads everything.
2. Check the new node exists in the Realtime Database console.
3. Put the same code into your other devices and connect them.
4. Publish the rules above.
5. Delete the old node in the console.

Publishing the rules first would block step 1, because the old short code fails
the length check.

## Building it yourself

The published `index.html` is generated. The source is a normal project.

```bash
cd app
npm install
npm run dev        # hot-reloading dev server
npm run typecheck  # strict, no unused locals
npm run build      # builds, then writes ../index.html
```

`vite-plugin-singlefile` inlines everything, including the typefaces, so the
output is one self-contained file that works offline. The only outbound request
the app ever makes is to the Firebase SDK, and only if you turned sync on.

Layout, and the rules the code is held to, are in [`app/README.md`](app/README.md).

## Your data

Everything lives in your browser's `localStorage` under `printLedger_*` keys.
Clearing site data for the page deletes it.

**Settings → Your data → Download a backup** writes one JSON file holding your
rates, every print, every bill and your discount codes. **Restore from a
backup** reads it back, after telling you exactly what it is about to replace
and what you currently have. Keep one somewhere that is not a browser.

That file is also how you move: to a new machine, or to a different Firebase
project. Restore it on the target, connect sync there, and the restored data is
what gets uploaded.

The ledger's CSV export is for spreadsheets and accountants. The JSON backup is
the one that actually restores.

No analytics, no telemetry, no phoning home. There is nothing in this app that
reports anything to anyone.

## Contributing

Issues and pull requests are welcome, particularly from people running a print
shop who find the pricing model wrong. Before opening a PR:

- `npm run typecheck` passes.
- The `localStorage` keys and the `Entry` and `Bill` field names are unchanged,
  or you have written a migration. Every device already syncing depends on them.
- New interface work keeps WCAG 2.1 AA. The current build has zero axe
  violations across all five moods at phone and desktop widths.

## Licence

MIT. See [LICENSE](LICENSE). Use it, sell prints with it, fork it, rebrand it.
