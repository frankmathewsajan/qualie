# Hackathon Tracks

## Grand Track

Aegis competes in the **Grand Track** as a full-stack, production-intent AI application pushing the frontier of real-time multimodal AI for consumer safety.

**Technical scope:** Three independent real-time pipelines running simultaneously — an AudioWorklet thread at 30ms cadence with sub-10μs jitter, a persistent bidirectional WebSocket to Gemini Multimodal Live, and a React state machine with live telemetry, weather context, and alert dispatch. None scaffolded; all built from scratch.

**Novel composition:** The core innovation is three frontier technologies assembled together for the first time:
- **Gemini Multimodal Live** streaming raw PCM at 30ms intervals — no ASR, no TTS, the model natively speaks and listens
- **AudioWorklet sub-30ms pipeline** with zero-copy transferable buffers — at 100ms chunks the model hears noise, at 30ms it hears a real room
- **Contextual multimodal analysis** composing audio bytes, GPS location, and live weather into a single REST call that produces a natural-language safety narrative, not a binary alarm

**Impact:** Runs in any browser on a $50 device. No account, no install, no hardware. Addresses a safety gap — acoustic monitoring with genuine AI comprehension — that no current consumer product fills.

**Why it's innovative:** Most audio monitoring tools apply a dB threshold like a smoke detector — a number trips an alarm. Aegis streams raw PCM directly into a large multimodal model that *understands* what it hears. The model knows the difference between a child laughing loudly and a child screaming in pain. That distinction is everything. When a threshold is breached, the guardian receives a structured natural-language analysis — what sounds were present, whether distress was detected, and a specific recommended action — not a binary alert. No existing consumer safety product does this.

The second innovation is the audio pipeline itself. By running downsampling inside a dedicated AudioWorklet thread — completely off the main JavaScript event loop — Aegis achieves jitter under 10μs per render quantum. Audio arrives at Gemini every 30ms, not every 100–500ms as typical implementations deliver. Combined with VAD tuned to 300ms silence tolerance (vs ~2000ms default), the system responds within half a second of a threat ending a sentence. The engineering difference between 30ms and 100ms chunks is not marginal — it is the difference between the model hearing a real room and the model hearing compressed noise.

**Execution:** Six production-level bugs resolved in a single hackathon window: binary WebSocket frame parsing, API referrer restrictions, AudioContext autoplay suspension, model endpoint discovery, token truncation, and Base64 stack overflow.

---

## Innovation Track — ElevenLabs

Aegis uses ElevenLabs voice synthesis to narrate its cinematic product demo — a four-slide, scroll-snapped audio-visual experience that walks viewers through the system's acoustic pipeline, stealth layer, and threat analysis architecture.

The narration was crafted to match the pacing of each slide transition: measured and technical on the architecture slides, urgent and human on the threat-detection sequence. ElevenLabs made it possible to iterate on tone and delivery rapidly — rewriting a line and regenerating in seconds rather than re-recording.

The result is a demo that feels like a product film rather than a screen recording, communicating the gravity of the problem (acoustic safety gaps in homes and care facilities) and the precision of the solution in under two minutes.

**Why ElevenLabs fits this project:** Aegis is a voice-first system. Its live product voice runs on Gemini Native Audio — real-time, bidirectional, sub-300ms. The demo narration needed the same quality bar. ElevenLabs delivered studio-grade clarity that matched the seriousness of the use case.
