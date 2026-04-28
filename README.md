<div align="center">
  <img src="public/aegis-logo.png" alt="Aegis Logo" width="120" />
  <h1 align="center">Aegis: AI Acoustic Safety Guardian</h1>
  <p align="center">
    <strong>"Silence is not always safe. Aegis listens when no one else can."</strong>
    <br/>
    <br/>
    <a href="https://qualie--aegis-weather.asia-southeast1.hosted.app/" target="_blank">View Live Demo</a>
    ·
    <a href="https://github.com/frankmathewsajan/qualie/issues" target="_blank">Report a Bug</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-15.0+-black?style=flat&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Google_Gemini-2.5_Flash-blue?style=flat&logo=google" alt="Gemini" />
    <img src="https://img.shields.io/badge/Firebase-v12.10-FFCA28?style=flat&logo=firebase&logoColor=black" alt="Firebase" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  </p>
</div>

---

Aegis is a real-time, **AI-powered ambient audio safety system** cleverly disguised as a standard local weather application to protect users in precarious situations. Behind its innocuous UI, it continuously monitors an environment through the device microphone using a powerful combination of **Web Audio APIs** for local edge detection and **Google Gemini's Multimodal Live API** for instantaneous contextual incident analysis.

The moment acoustic stress exceeds a safety threshold, Aegis securely dispatches context-aware, structured threat intelligence — transforming the device into an active guardian with sub-30ms reaction latency.

## Comprehensive Features

### Client-Side Safety Systems
- **Edge Acoustic Monitoring**: Near-zero latency threshold analysis using **Web Audio API** and a custom isolated `AudioWorklet`. 
- **Multimodal AI Fallback**: Integrates natively with the **Google Gemini 2.5 Flash Native Audio API** to interpret raw sound data (like distinguishing a genuine cry for help from a loud TV).
- **Stealth Mode (Ghost UI)**: A double-tap disguised lock screen interface that completely conceals the application's active monitoring state.
- **Silent Camera Burst**: Automatically and silently captures front and rear uncompressed photography directly triggered upon a breach. 
- **Context-Aware Analytics**: Injects high-accuracy **Open-Meteo** weather telemetry and live Geolocation to prevent false positives.
- **Continuous Multi-Alert Support**: Smart cooldowns allow the system to trigger multiple independent safety alerts in the same session if environmental dangers persist.
- **Dead-Man Switch**: A continuous heartbeat connection. If the device is abruptly destroyed or loses signal, the system registers a critical connection loss alert.

### Emergency Dispatch & Dashboard Console
- **Live Guardian Dashboard**: A centralized, real-time command center built for emergency operators. Monitors all active user clusters, live map telemetry, and aggregated threat data.
- **Two-Way "Voice of God" Operator Audio**: Dispatchers can record live audio broadcasts directly from the dashboard and push them to the user's device.
- **Live Text Messaging & Notifications**: Operators can send critical textual guidance to users, firing local OS-level push notifications to ensure delivery even if the screen is locked.
- **WhatsApp SOS Integration**: Fallback emergency contact routing capable of blasting automated, pre-typed deep-link distress beacons (`wa.me`) bypassing restrictive mobile browser popup constraints.
- **Fake Call Generation**: A simulated incoming phone call interface to help users safely de-escalate or exit uncomfortable situations.

---

## Architecture Diagram

```mermaid
graph TD
    subgraph Client_Device ["Client Device"]
        Mic["Device Microphone"] --> Worklet["AudioWorklet Thread"]
        Worklet -->|"Local Buffer"| Volume["RMS Threshold Analyser"]
        Worklet -->|"16 kHz PCM WebSocket"| GeminiLive["Gemini Live API"]

        Volume -->|"> 85 dB Trigger"| ActionController{"Breach Actions"}
        ActionController -->|"Dual Capture"| Camera["Silent Dual Camera Snap"]
        ActionController -->|"Record"| Chunk["Audio PCM Blob"]
        ActionController -->|"Geolocate"| GPS["Geolocation API"]
    end

    subgraph Firebase_Cloud ["Firebase Cloud"]
        Chunk -->|"POST /api/alert"| API["Next.js Route Handlers"]
        GPS --> API
        Camera --> API
        
        API -->|"Store"| Firestore[("Firebase Firestore")]
        API -->|"Analyze"| GeminiREST["Gemini 2.5 Flash REST"]
    end

    subgraph Command_Center ["Command Center"]
        Firestore -->|"Real-time Sync"| Dashboard["Guardian Dashboard"]
        Dashboard -->|"Voice of God / Text"| DispatchAPI["/api/messages"]
        DispatchAPI --> Firestore
        Firestore -->|"Push Notif"| ClientDevice["Target User Device"]
    end
```

---

## Technical Approach & Implementation Nuances

Aegis handles audio processing with absolute privacy and efficiency by shifting the initial load to the client's edge.

1. **AudioWorklet Isolation**: Instead of pushing continuous microphone data to the cloud, a highly optimized `AudioWorklet` thread processes raw PCM data locally. It computes the Root Mean Square (RMS) volume of the audio stream every few milliseconds, completely insulated from the main UI thread's React render cycles.
2. **Dynamic Context Aggregation**: When the edge detects an acoustic spike surpassing the defined threshold (or specific distress keywords), the client captures a continuous buffer of audio. Simultaneously, it pulls live weather APIs, geolocation data, and triggers a silent dual-camera burst to build a comprehensive contextual packet.
3. **Gemini Live & REST Synergy**: While the `v1beta` Live WebSocket API handles continuous streaming and instantaneous distress keyword recognition, the packaged breach data (Audio Blob + Location + Context) is sent to a Serverless function (`Next.js Route Handler`), which batches a rich multimodal prompt to the standard Gemini 2.5 Flash API for high-accuracy threat assessment.
4. **Resilient Communication**: The system uses Firebase Firestore not just as a database, but as a real-time WebSocket pipe. This ensures that when the AI completes its analysis, the Command Center dashboard reflects the new threat cluster immediately, and any operator messages are pushed instantaneously down to the imperiled user's device.

---

## Technologies Used

- **Frontend & Backend Framework**: Next.js 15+ (App Router, Server Actions)
- **Database & Hosting**: Firebase (Firestore, Cloud Messaging, App Hosting)
- **AI / ML**: Google Gemini 2.5 Flash Native Audio (via both `v1beta` Live API WebSockets and REST endpoint batch analytics)
- **Styling & UI**: Tailwind CSS v4, Lucide React, Radix UI Primitives, GSAP for fluid scroll and entry animations
- **Mapping**: `@vis.gl/react-google-maps`
- **Native APIs**: Web Audio API (Level 2 WebRTC), HTML5 MediaDevices (Camera), Navigator Geolocation, PWA Notification Service Workers.

---

## Getting Started

### Prerequisites

| Requirement | Description |
|-----------|-----------|
| Node.js | v20 LTS or higher |
| Google Cloud | A GCP Project with Gemini APIs enabled |
| Firebase | An active Firebase Project (for Firestore / Push Notifications) |
| Browser | Modern WebRTC-capable browser (Chrome 90+, iOS Safari 15+) |

### Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/frankmathewsajan/qualie
   cd qualie
   npm install --legacy-peer-deps
   ```

2. Establish securely your Cloud API keys. Ensure Firebase Service Account setup for VAPID keys.

3. Create the necessary `.env.local` file mapping these parameters:
   ```env
   # Server-side key (used for REST Analysis routes)
   GEMINI_API_KEY=your_gemini_key

   # Client-side key (used for WebSocket live interactions)
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key

   # Full publicly addressable URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Firebase Configuration (Public config)
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=app.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=app
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=app.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=api_id

   # VAPID constraints for web push notifications 
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_pub
   VAPID_PRIVATE_KEY=your_vapid_priv
   VAPID_SUBJECT="mailto:admin@aegis.app"
   
   # Maps fallback
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
   ```

### Running Locally

Boot up the development environment:
```bash
npm run dev
```

Navigate to `http://localhost:3000/listen`. Be sure to grant Microphone, Local Settings, Location, and Notification permissions to fully utilize the suite of crisis-response capabilities. 

---

## Future Development & Optimizations

- **On-Device Edge Filtering**: Replacing cloud-based ML analytics with an optimized client-side `TensorFlow.js` YAMNet implementation to classify ambient noises autonomously.
- **Continuous WebRTC Streams**: Progressing from short-chunk uploads to consistent WebRTC data streams bridging multiple Guardian devices in real-time.
- **Hardware Integration**: Expanding the listening stack to intercept physical Bluetooth LE earpiece hardware button events to bypass phone lock screens completely.
- **Federated Authentication**: Deploying Google Firebase Authentication wrapper for streamlined operator and user provisioning.

---

<div align="center">
  <p><strong>Aegis</strong> was built with safety-critical considerations paramount.</p>
  <p><em>“Your voice, always heard.”</em></p>
</div>
