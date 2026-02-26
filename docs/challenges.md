# Challenges We Ran Into

## 1. Binary WebSocket Frames — The Silent Failure

The Gemini Live API sends responses as **binary WebSocket frames**. The default `WebSocket.binaryType` is `'blob'`, so `event.data` arrives as a `Blob`. Calling `JSON.parse(event.data)` is silently calling `JSON.parse("[object Blob]")` — returns `null`, no error thrown. The `setupComplete` event never fired. The connection hung indefinitely with no indication anything was wrong.

**Found it** by adding a server-side log relay (`/api/gemini-log`) and noticing `setup_complete` never appeared while the raw frame count kept climbing. Fix: set `ws.binaryType = 'arraybuffer'` and decode incoming frames with `TextDecoder` before passing to `JSON.parse`. Two lines. Three hours.

> **Type contract:** `event.data : Blob | ArrayBuffer | string` — only `ArrayBuffer` is synchronously decodable. `Blob` requires an async `.text()` call that the synchronous `JSON.parse` path never awaits, making the failure invisible at runtime.

---

## 2. Model Name Hell — The API Graveyard

| Model tried | Endpoint | Result |
|---|---|---|
| `gemini-live-2.5-flash-preview` | `v1alpha` | 404 |
| `gemini-2.0-flash-live-001` | `v1alpha` | 1008 Close |
| `gemini-2.0-flash-exp` | `v1alpha` | 1008 Close |
| `gemini-2.0-flash-live-001` | `v1beta` | 1008 Close |
| `gemini-2.5-flash-native-audio-preview-12-2025` | `v1beta` | ✅ Connected |

`v1alpha` does not support bidi streaming for current models. `v1beta` is required. The working slug is the full date-suffixed name — not the short alias in most docs. We found it by building a minimal test harness that exhausted each combination and logged the close code.

---

## 3. API Key Referrer Restriction — The 403 Mystery

Our API key had HTTP referrer restrictions set in GCP. Server-side `fetch()` from Next.js route handlers sends **no `Referer` header** — so all `/api/alert` REST calls returned `403 Forbidden` with no useful body. Browser-side worked fine (browsers always include `Referer`). Fix: manually inject `'Referer': process.env.NEXT_PUBLIC_APP_URL` into all server-side Gemini request headers.

> **Why it's asymmetric:** Browser → Google passes through a `Referer` set by the browser engine automatically. Server → Google is a raw Node.js `fetch` with no origin context — GCP's key restriction system sees it as an unknown referrer and rejects it at the IAM layer before the request reaches the model.

---

## 4. AudioContext Autoplay Suspension

Browsers suspend `AudioContext` until a user gesture. Initialising on mount meant playback was completely silent — no error, the `AudioBufferSourceNode` scheduled against a clock that was never advancing. Fix: call `ctx.resume()` inside the user-initiated start handler, not on mount.

---

## 5. Truncated AI Analysis

REST responses cut off mid-sentence. Cause: `maxOutputTokens: 200` left over from early testing. Our 3-question prompt reliably produces 5–8 sentences. Raising to `600` resolved it immediately.

---

## 6. Base64 Stack Overflow on Large Buffers

Spreading a large typed array as function arguments (`String.fromCharCode(...new Uint8Array(buffer))`) exhausts the JS call stack for any buffer over ~65KB — throwing a `RangeError` that was silently swallowed by our try/catch, dropping the entire analysis with no visible error. Fixed by chunking the conversion at 8192 bytes per slice, each small enough to spread safely, then concatenating before calling `btoa()`.

> **Stack frame cost:** Each spread element consumes one call stack slot. V8's default stack depth is ~15,000 frames. At 1 byte = 1 slot, the limit is ~15KB safely spreadable — a 2-second audio blob at 16kHz PCM is ~32KB, well past the threshold. Chunk size `n = 8192` keeps `n ≪ stack_limit` with a comfortable safety margin.
