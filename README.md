# Coffee Buddy ☕

Live: <https://coffee.delgadosanchez.com/>

Who bought the last coffee? Add the people you go for coffee with, tap who paid
each time, and it tells you whose turn it is next.

Plain HTML/CSS/JS — **no build step, no frameworks, no dependencies**.
The look comes from the "Whose Round? Coffee Tracker" Claude Design canvas.

## Using it

- **Add a buddy** with the box at the bottom.
- Each card shows **whose round** it is. Tap a card to open it, then tap
  **Me** or **<Name>** for whoever is buying. Whoever is due is lit up. Got it
  wrong? Tap **Undo** on the toast that appears (it stays for 5 seconds).
- An open card also has **Undo last** and **Remove <Name>**.
- Cards sort by the most recent coffee first.

### On the iPhone

Open the site in Safari → Share → **Add to Home Screen**. It opens full-screen
like an app and works offline (service worker).

Data lives in `localStorage` **on that device only**. The home-screen app has
its own storage, separate from Safari tabs, so set it up from the home-screen
icon and not from a Safari tab. Deleting the home-screen icon deletes the data.

## Folder structure

```
/
├── index.html             ← the whole UI
├── manifest.webmanifest   ← home-screen app metadata
├── sw.js                  ← offline cache (network-first)
├── assets/
│   ├── ledger.js          ← pure logic: add/remove people, record rounds, whose turn
│   ├── app.js             ← DOM + localStorage glue
│   ├── styles.css
│   ├── dragon.png, cup.png ← mascot art from the Claude Design canvas
│   └── icon-*.png         ← app icons, built from cup.png
├── scripts/make-icons.py  ← regenerates the app icons from cup.png (needs Pillow)
└── tests/ledger.test.mjs
```

## Running locally

```
python -m http.server 8000
# then open http://localhost:8000
```

## Tests

Node 20+, no install needed:

```
node --test
```

CI (`.github/workflows/test.yml`) runs the same thing on every push and PR.

## Deployment (GitHub Pages)

Deploys straight from `main`. There's no build and no deploy workflow, the
same setup as `arcade-attic`. `.nojekyll` makes Pages serve the files as-is.

**One-time setup:** GitHub → repo → Settings → Pages → Source: **Deploy from a
branch** → **`main`** / **`/ (root)`**.

Served at **<https://coffee.delgadosanchez.com/>** via the committed `CNAME`
file, mirroring `arcade-attic`:

1. **DNS** (at the `delgadosanchez.com` DNS host): `CNAME` record `coffee` →
   `marcoedelgado.github.io`.
2. **Settings → Pages → Custom domain:** `coffee.delgadosanchez.com` → Save,
   then tick **Enforce HTTPS** once the certificate is issued (up to ~15 min).

When you change which files the app ships, bump `CACHE` in `sw.js` so phones
drop the old offline copy.
