# Realtime Web Avatar Voice Assistant

A browser-based real-time voice assistant built using **WebRTC** and the **OpenAI Realtime API**, featuring live audio interaction, animated avatar lip-sync, and real-time captions.

---

## Overview

This project demonstrates a low-latency, bidirectional voice assistant that runs entirely in the browser.  
Users speak through their microphone, and the assistant responds with synthesized speech, live captions, and synchronized avatar animation.

The implementation focuses on **real-time communication**, **audio streaming**, and **human-like interaction** without relying on external UI frameworks.

---

## Features Implemented

### ✅ Real-Time Voice Interaction
- WebRTC-based audio streaming
- Microphone input sent directly to OpenAI Realtime API
- Assistant audio streamed back with minimal latency

### ✅ Animated Avatar
- Canvas-based face rendering
- Mouth movement synchronized with audio energy
- Eye blinking and subtle gaze movement
- Avatar reacts to both user speech and assistant responses

### ✅ Live Captions / Subtitles
- **User captions** via browser Speech Recognition API
- **Assistant captions** via OpenAI Realtime text output
- Displayed live in the UI

### ✅ Clean Client–Server Architecture
- Frontend: Vanilla HTML, CSS, JavaScript (ES modules)
- Backend: Node.js + Express
- Secure server-side OpenAI API usage (no key exposure)

### ✅ Error Handling
- Graceful handling of connection failures
- Clean teardown of WebRTC sessions
- Informative logging for debugging

---

## Project Structure
```
project/
├── public/
│ ├── index.html # UI layout
│ ├── styles.css # Styling
│ ├── app.js # UI controls (connect / disconnect)
│ ├── webrtc.js # WebRTC + realtime events
│ ├── openai.js # SDP exchange logic
│ ├── audio.js # Mic capture + audio analysis
│ ├── lipsync.js # Avatar drawing & animation
│ └── avatar.js # (reserved / optional)
│
├── server.js # Express server + OpenAI Realtime API
├── .env # Environment variables
└── README.md
```


## Instruction to Run
- npm install
- node server.js

<img width="1044" height="658" alt="Screenshot 2026-01-01 at 3 35 30 AM" src="https://github.com/user-attachments/assets/f19d2b5a-2497-4b73-ab7d-0155601c6440" />

