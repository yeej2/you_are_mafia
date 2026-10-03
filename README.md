# Midnight Alibi 0.2

A responsive Mafia game for 5–10 human/computer players with generated Android/iOS projects and a prebuilt offline browser edition. Start with **START_HERE.md**.

## Implemented

- Full day → vote → night → win → rematch flow; two Mafia, Doctor, Detective and Citizens.
- Authoritative D1 rooms, six-character invitations, separate device sessions, reconnect, secret-role filtering and private investigations.
- Timed phases: 120-second discussions and 60-second votes/nights. Missing votes abstain; missing night actions skip. A polling connected client advances expired phases. Host migration after 45 seconds away. Explicit leave transfers the host immediately when another human is present.
- Structured conversational AI integration with private memory, editable persona instructions, public vote history, legal-target validation, 12-second request timeouts, 40-call match limit, and strategy fallback.
- Four editable public-figure parody presets plus seven original noir personalities.
- Database mutation leases and revision checks prevent overlapping updates. Basic per-session chat and room-creation throttles. No hidden roles or other bots' memory go to the client or a bot's model context.
- Native mobile client bundles, customized icons/splashes, PWA install help, room sharing, role reveal, scrollable live discussion and action confirmation.
- Original generated art, synthesized looping music and phase effects.
- Consent-gated, disabled ad provider interface restricted to between-match use. No SDK, tracking or ad revenue is active.

## Simulation Studio

Open **Simulation Studio** from the main menu. Cast 5–8 AI characters, write their personality and appearance, choose a voice, and assign exactly two Mafia, one Doctor, one Detective, and the remaining Citizens. You direct without occupying a player seat. Save reusable personas locally on your device. Regular games also enforce an eight-bot maximum.

**Produce episode** runs the match. Offline mode uses strategy bots. Connected mode can automatically generate a four-expression character atlas for each persona, simulate conversational turns, and synthesize the actual dialogue with the selected original voices. Change the set (noir city or village), camera cuts, role labels, and pacing. The animated renderer includes speaking motions, expression changes, role props, voting/action indicators, day/night lighting, and elimination markers. The reference informed the staged-cast format; its footage and assets are not included.

**Export animated video** records a 1280×720 animated episode with captions, generated dialogue when available, and the original music. Export takes approximately playback time and requires the tab to remain visible. The browser selects WebM or MP4 according to available recording codecs; MP4 is not guaranteed. Preview the resulting video and download it, or download the JSON transcript. Browser-native recording is not a cloud render queue and native-phone recording remains unverified.

For connected art/voice generation, apply the new migrations `0003_slim_kulan_gath.sql` and `0004_mean_wendell_vaughn.sql` once, after the existing migrations. Set server-only `OPENAI_API_KEY`; optional `OPENAI_IMAGE_MODEL` and `OPENAI_VOICE_MODEL` default to `gpt-image-2` and `gpt-4o-mini-tts`. Provider availability depends on the account. The built-in starter Vivian expression atlas works offline. Live image/speech API integration is implemented and mocked in tests; live provider quality and access have not been verified here.

Media requests require the director's session, reuse cached assets, reserve budget atomically, and allow up to three attempts per asset. Limits are 16 image attempts and 200 speech attempts per simulation, with failed attempts included. These are not global spending limits. Persona text/appearance and game dialogue are sent to the provider when generation is enabled. Assets are cached in D1 and browser IndexedDB; personas use localStorage, and the current match uses sessionStorage. Clearing browser storage loses local data. Media records, like rooms, do not yet have automatic cleanup. Simulations stop at a winner or a draw after 20 nights; private night scenes appear only in the director's replay, never in bot observations.

## Development

Node 24 and pnpm 11.25.0 are used for this build. Install dependencies with `pnpm install --frozen-lockfile`.

```sh
pnpm build
```

For a NEW local preview database only, apply each migration once, in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_lively_phalanx.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_normal_shinko_yamashiro.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_loving_miracleman.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_slim_kulan_gath.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0004_mean_wendell_vaughn.sql
pnpm dev
```

Do not replay previously applied migrations. Sites applies production migrations separately. The manifest declares the logical DB binding; it has no project ID because the publishing service failed to register the site. No alternative deployment was performed.

For local conversational AI, copy `.env.example` to `.env`, supply a server-only `OPENAI_API_KEY`, and restart. In hosted deployment configure this as a secret through Sites; do not commit it. Model defaults to `gpt-4o-mini`. An empty key intentionally selects strategy bots. `docs/AI_DESIGN.md` explains privacy, cost controls and model verification limits. The OpenAI Developers plugin could not be connected because its service returned the same integration error as hosting.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm mobile:build
```

Tests cover the rules, 100 simulated games, model observation isolation, provider schema/validation/fallback/budget, and actual API handlers using a SQLite-backed D1 adapter. Separate session tests cover create/join, chat, voting, native bearer/CORS behavior, forged identity rejection, mutation locks, timers and host recovery. Provider responses are mocked; no real model was called. Browser checks cover room restore, character editing, lobby and gameplay controls. Live-hosted cross-device and physical-phone testing remain outstanding.

## Mobile

See `docs/MOBILE.md`. The `android` and `ios` folders are actual Capacitor native projects containing the shared game assets. `mobile-dist` is a ready-built client. Android compilation was attempted, but the network blocked the Gradle download; no APK is claimed. iOS compilation needs Xcode on a Mac. The manual Android GitHub workflow is provided but has not run. Store accounts, signing and submissions remain external steps.

## Offline edition

`node scripts/play-offline.mjs` serves the bundled game at http://127.0.0.1:8080. Choose **Offline practice**. No packages or key are needed for this launcher. It saves practice in sessionStorage; closing the browser session or leaving the table discards it. It does not provide a multiplayer server or conversational AI.

## Operational limits

Rooms become inaccessible after 24 hours without a persisted update; database records are not yet automatically purged. No sign-in, cross-device identity recovery, public matchmaking or account system is present. Private room access uses the invitation code. Timers are resolved on the next connected client's pulse, not a background scheduler. The per-match model call cap is not a site-wide daily budget: set provider project limits before opening public access. No claim of production load capacity or app-store approval is made.

Artwork provenance is in `docs/ASSETS.md`. Music uses no third-party samples. Dependency licenses remain their own. The name is a working title, not a trademark clearance claim.

Studio characters now sit around a circular candlelit table with a smooth speaker-following orbit camera. Upload JPEG/PNG/WebP face photos (8 MB maximum), adjust zoom and crop, and save them with personas. Photos remain in browser IndexedDB and are composited locally into preview/video; they are not sent to the AI provider. Generated art uses original rounded nocturnal creatures with felt/clay styling.

## Render deployment

Use `render.yaml` to deploy a single Node web service with a 1 GB persistent disk. Build: `pnpm render:build`; start: `pnpm render:start`. The server bundles the existing API handlers and adapts their D1 calls to SQLite. Migrations run once, transactionally, at startup. Set `DATABASE_PATH=/var/data/alibi.sqlite`; Render supplies `RENDER_EXTERNAL_URL` for secure cookies and same-origin validation. Set `APP_ORIGIN` if using a custom domain. Keep a single instance because the database lives on the attached disk. Health check: `/healthz`. Provider keys belong in Render environment settings, never the repository. Without `OPENAI_API_KEY`, multiplayer and offline-style bots still work; provider features remain disabled. Photos and saved personas stay on each browser device. Render pricing and persistent-disk limitations: https://render.com/docs/disks .
