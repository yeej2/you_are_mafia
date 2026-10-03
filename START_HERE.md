# Play Midnight Alibi

## Play offline now

1. Extract this entire archive.
2. Install Node.js 24 if it is not already installed.
3. Open a terminal in the extracted folder and run:

   `node scripts/play-offline.mjs`

4. Open `http://127.0.0.1:8080` in your browser.
5. Select **Offline practice**, edit the computer players if you like, then **Deal the roles**.

No dependency installation or API key is needed for this prebuilt offline version. It uses strategy bots and synthesized music. The source and generated Android/iOS projects are also included.

## Enable online play and AI

The code is implemented, but this build is not hosted yet. The publishing service returned an error. After deploying the server and its D1 migrations, the room buttons connect to that server. Configure a server-only `OPENAI_API_KEY` and optionally `OPENAI_MODEL` to activate conversational AI. Do not paste secrets into chat or into the client code.

For a local full-stack setup and development commands, read README.md. For native apps, read docs/MOBILE.md.

## Current verification

Rules and API integration tests pass, including separate player sessions, host restrictions, role filtering, timer advancement and recovery. Fake-provider tests cover AI request/response behavior. Web and mobile web bundles build. Real provider quality, physical phones, APK/iOS compilation and live cross-device hosting remain unverified because required services/tools are not available here.
