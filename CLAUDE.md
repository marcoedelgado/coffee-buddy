# Coffee Buddy

Static GitHub Pages app that tracks who bought the last coffee between the user and each colleague (always in pairs: me + one person).

- **No build step, no frameworks, no dependencies.** Plain HTML/CSS/JS, ES modules.
- All rules live in `assets/ledger.js` (pure, immutable, tested by `node --test`). `assets/app.js` is only the DOM and `localStorage` glue, so put new logic in the ledger along with a test.
- State is in `localStorage` under `coffee-buddy:v1`. If the shape changes, keep `parseState` able to read old data, because the only copy of the data is on the user's iPhone.
- Use **relative** paths everywhere (no leading `/`) so the app works on both the `*.github.io/coffee-buddy/` subpath and a custom domain.
- Bump `CACHE` in `sw.js` when the shipped file list changes.
- Deploys from `main` root. See `README.md`.
