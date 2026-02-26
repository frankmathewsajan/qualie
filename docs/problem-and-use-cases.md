# The Problem Aegis Solves

Every year, preventable tragedies occur in homes, classrooms, and care facilities — not because help was unavailable, but because **no one was listening at the right moment**.

Existing tools fall short in a fundamental way:

| Solution | Critical Flaw |
|---|---|
| **Cameras** | Privacy-invasive, miss audio-only distress |
| **Panic buttons** | Require the victim to be calm and physically capable |
| **Wearables** | Need constant charging and contact |
| **dB-threshold monitors** | Can't tell a child laughing from a child screaming |

**The gap is acoustic.** Human distress has a sound. No consumer product today treats sound as a primary safety vector with genuine AI interpretation. Aegis fills that gap.

---

## What People Use Aegis For

**👨‍👩‍👧 Parents & Child Safety** — Run Aegis in any room where a child is alone. No camera, no stored footage, no cloud recordings. On a distress signature, parents get an immediate plain-English report — not a timestamp to review later. A panic button is useless if a child can't reach it. Aegis requires nothing from the child.

**🧓 Elder Care** — Provides non-invasive acoustic monitoring for elderly individuals living alone — no cameras, no wearables, nothing to remember to press. A family caregiver knows within seconds what Gemini heard and what action is recommended.

**🏥 Care Facilities** — Deployed in counselling centres or mental health facilities as an additional layer alongside staff — extending the effective listening radius of every human on the floor without replacing anyone.

**📱 Low-Resource Deployment** — Runs entirely in a web browser. A $50 Android phone becomes a monitoring station. No app install. No hardware subscription.

**🔇 Covert Personal Safety** — Aegis hides behind any ordinary app — weather, calendar, maps. Visible panic buttons escalate violence. Aegis requires nothing from the person in danger. It is already listening.

---

## What Makes the AI Layer Different

Most audio monitors apply a dB threshold like a smoke detector — a number trips an alarm. Aegis streams raw PCM audio directly into Gemini Multimodal Live, which has **semantic understanding** of what it hears. It knows the difference between a child laughing and a child screaming. That distinction is everything.

On a threshold breach, the guardian receives a structured AI analysis:
1. What sounds are present
2. Whether distress or danger is detected
3. A specific, contextual action recommendation

Not a binary alarm — a paragraph written by an AI that has heard the audio, knows the local weather, knows the location, and gives a recommendation a human can act on immediately.

**Privacy:** Audio is processed ephemerally — never stored, never logged. The Live API is a direct browser ↔ Google WebSocket. Audio never touches Aegis infrastructure.
