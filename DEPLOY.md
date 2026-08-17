# Deploying the Penta web app (Vercel)

Phase 1 ships as a **web page** (Expo + react-native-web, expo-router, SPA). This
is a testing deploy — Hobby (free) plan, private repo, from the `dev` branch.

The build config lives in [`vercel.json`](./vercel.json): it builds only the
`apps/mobile` workspace (`npm run -w apps/mobile build:web` → `apps/mobile/dist`)
and rewrites unknown routes to `index.html` (the app is `output: "single"`, a
single-page app, so a refresh on `/play` needs that fallback).

## One-time setup (dashboard)

1. **Account.** Any Vercel account. The **Hobby plan is free and supports
   private GitHub repos** — no need to make the repo public or pay.
2. **Import.** New Project → import this repo → authorize the Vercel GitHub app.
3. **Framework Preset:** `Other`. (There is no Expo preset; `vercel.json`
   supplies the build/output commands, so leave those dashboard fields alone —
   they're overridden by the file.)
4. **Root Directory:** leave at the repo root. `@penta/engine` is an npm
   workspace dependency, so install must run at the root to link it. (Do **not**
   set the root to `apps/mobile`.)
5. **Node.js Version:** Settings → General → `20.x` (Expo SDK 57 requires it).
6. **Production Branch:** Settings → Git. See the two options below.

## Deploying `dev`, not `main`

Vercel deploys one "Production Branch"; every other branch gets an automatic
Preview deployment. Two choices:

- **Recommended for testing — use previews.** Leave production as `main` and push
  `dev`. Each push builds a preview, and the stable branch alias
  `‹project›-git-dev-‹scope›.vercel.app` always points at the latest `dev` build.
  Bookmark that URL.
- **Make `dev` the production URL.** Settings → Git → Production Branch → set to
  `dev`. Pushes to `dev` then go to the production domain.

`vercel.json` must exist on whichever branch you deploy (it does on `dev`).

## CLI alternative (no GitHub connection)

From the repo root:

```sh
npx vercel          # preview deployment
npx vercel --prod   # production deployment
```

Uploads a build straight from your machine — no repo visibility required.

## Verify the build locally first

```sh
npm run -w apps/mobile build:web   # emits apps/mobile/dist (gitignored)
npx serve apps/mobile/dist         # optional: preview the static output
```

## If a build fails

- **`@penta/engine` not found / module resolution:** Root Directory isn't the
  repo root, so workspaces didn't link. Reset it to the root.
- **Node/engine errors:** Node version isn't 20.x.
- **404 on refreshing a sub-route:** the `rewrites` rule isn't taking effect —
  confirm `vercel.json` is present on the deployed branch.
