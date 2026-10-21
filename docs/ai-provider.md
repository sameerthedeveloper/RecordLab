# AI provider (one sign-in)

The AI assistant's **Direct Generate** and the admin mail writer work with just a Record Lab sign-in. The server holds an
API key and answers through `POST /api/ai/generate`; Puter.js is the fallback.

## Order
- No Puter account linked: the server key answers first (no popup, no second login), then Puter if the server can't.
- Puter account linked: Puter first, then the server key.
- No API key configured: a keyless public provider (Pollinations' anonymous tier) answers, then Puter. `AI_KEYLESS=off` turns this off for Puter only.

## Set it up (server environment, never `NEXT_PUBLIC_*`)
Pick one:

| Provider | Variables |
| --- | --- |
| Claude | `ANTHROPIC_API_KEY`, optional `AI_MODEL` (default `claude-sonnet-5-5`) |
| OpenAI-compatible (OpenAI, OpenRouter, Groq, Gemini compatibility endpoint, a local server) | `AI_API_KEY`, optional `AI_BASE_URL` (default `https://api.openai.com/v1`), optional `AI_MODEL` (default `gpt-4o-mini`) |

Anthropic wins if both are set. With neither, the keyless provider is used. Restart the server after changing them.

## Keyless provider
Needs no account or key. Its anonymous tier is free but shared by every user of your server and can be slow (a full record took about 25 seconds in a test) or rate-limited; Record Lab then falls
back to Puter. Prompts (experiment title, language, requirements) go to that third party, so set `AI_KEYLESS=off` if that is not acceptable. For steady quality use a keyed provider above.

## Limits and safety
- Only signed-in users can call it (their Firebase ID token is verified on the server). The key never reaches the browser.
- Per user: 6 requests a minute and 60 a day, held in the server instance's memory (a restart or another instance resets them). Add a
  shared store if you run several instances. Prompts are capped at 24,000 characters and replies at 6,000 tokens.
- The editor also limits itself to 5 requests a minute.
- Set a spending limit at the provider: this route is the only thing between a signed-in user and your key.

## Controlling it (Admin panel > AI)
Admins open **/admin/ai** (the AI tab in the admin sidebar). The controls are saved to `config/ai`:
- **AI assistant for everyone:** off hides Direct Generate (Copy prompt and Paste import keep working). The server refuses too.
- **Who answers:** Automatic, Keyless provider, Your API key, or Puter only. Modes the server can't serve are flagged "Not set up on the server".
- **Requests a minute and a day, per user**, and an optional **model** that overrides `AI_MODEL`.
- **Test the saved settings** runs one tiny request through the server and shows how long it took.

Changes reach the server within 30 seconds (it caches `config/ai`). Deploy the updated `firestore.rules`: they let every signed-in user read `config/ai` and only admins write it.

## What students see
Settings > AI assistant has one choice: how the assistant opens (Copy prompt, Paste & import, or Direct LLM). While an admin has the AI switched off,
Direct LLM is not offered there and its tab is hidden inside the assistant, so students never meet a dead button.
