# Conversational AI implementation

Implemented in `lib/ai.ts`, called by the authoritative room API for opening discussion, human chat responses, votes and night actions. Set `OPENAI_API_KEY` on the server to enable it. `OPENAI_MODEL` is configurable and defaults to `gpt-4o-mini`. No key is shipped, and the live provider was not called in this environment.

Each request receives only that bot's filtered observation: own role, known Mafia allies when applicable, own investigations, private memory, public messages, public voting history and legal targets. It never receives unknown roles or another player's memory. A JSON-schema response carries speech, target and private memory. Targets are checked again before use; night speech is discarded. The deterministic engine owns all rules and outcomes.

Model calls have a 12-second timeout, 700 output-token limit, no response storage (`store:false`), and at most 40 requests per match. A database lease serializes room mutations, preventing simultaneous clients from paying for duplicate overlapping bot turns. Failed calls and exhausted match budgets use strategy bots. The key and model configuration remain server-only. A human can start new matches, so the per-match cap is not a site-wide spending cap; configure a project budget before public launch.

Personality descriptions and chat are untrusted data. The system prompt scopes bots to game behavior. Public-figure presets are fictional parody and carry no endorsement. Private bot summaries help preserve claims and suspicions; no model can be promised perfectly truthful rule-following or consistent deception.

Tests inspect observation isolation, structured request shape, invalid target handling, provider failure, night secrecy and per-match budgets. They use a fake provider and do not establish live-model quality. Test real conversations after activation before promoting the bots as strong opponents.

Reference used for the implemented request schema: https://developers.openai.com/api/docs/guides/structured-outputs

## Simulation production

The simulation director is separate from the cast, has no vote or night action, and receives the full replay and role assignments. Bot observations still use each individual bot's filtered view. Connected discussion advances one speaker per request, twice through the living cast each day, so later speakers can react to earlier dialogue without exceeding the request timeout. The existing 40-call strategy fallback also applies to simulations.

Character art uses the [Image API](https://developers.openai.com/api/docs/guides/image-generation); narration uses the [speech endpoint](https://developers.openai.com/api/docs/guides/text-to-speech). Model names are configurable. Atlas prompts combine persona, appearance, and assigned role. Speech uses actual replay text with selected stock voices and an explicit original-character delivery instruction. The studio and exported film disclose synthetic voices. No voice cloning is implemented.

Media caching, authorization, attempt reservation and retries live in `/api/simulation-media`. Provider calls have bounded timeouts, images and audio have size limits, and failed attempts count against per-simulation budgets. Cached failed requests may retry twice; stale pending reservations become retryable after three minutes. A process crash can therefore consume an attempt, but never unlock an unlimited retry loop. Media data currently lives in D1; an object store and retention job would be appropriate before operating this at significant scale.
