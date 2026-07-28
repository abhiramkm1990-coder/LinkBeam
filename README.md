# LinkBeam 📡

LinkBeam is a privacy-first, real-time cross-device link, text, and image sharing tool built with **React**, **Tailwind CSS**, **Node.js**, **Express**, **WebSockets**, and **WebRTC Data Channels**.

Pair devices instantly using a QR code or a human-friendly 6-character PIN — no account creation, no app installation, and zero server storage.

---

## 🚀 Key Features

1. **Instant Device Pairing**: Scan a QR code or enter a 6-character PIN to pair laptop + phone, two phones, or any web browsers.
2. **WebRTC Peer-to-Peer Transfer**: All text notes, links, and images stream directly between paired devices over low-latency WebRTC data channels.
3. **No Server Storage**: Content never touches a database or cloud storage bucket.
4. **AdSense Admin Dashboard**: Integrated `/admin` panel to manage and toggle Google AdSense unit placements (`header_banner`, `sidebar`, `footer`) dynamically.
5. **Dark Mode & Responsive**: Smooth dark/light theme switching with adaptive mobile-first design.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS v4, Motion (`motion/react`), Lucide React icons, `qrcode.react`, `html5-qrcode`.
- **Backend & Signaling**: Node.js, Express, WebSocket (`ws`).
- **P2P Transport**: WebRTC DataChannels with public Google STUN servers and TURN server fallback config.

---

## 📂 Project Structure

```
├── server.ts                    # Express + WebSocket signaling server
├── server/
│   └── ad-store.ts              # Persistent AdSense placement configuration store
├── src/
│   ├── main.tsx                 # Client entry point
│   ├── App.tsx                  # Primary LinkBeam application layout & state
│   ├── types.ts                 # Global TypeScript definitions
│   ├── lib/
│   │   ├── device.ts            # Device type & UserAgent detector
│   │   └── webrtc.ts            # WebRTC PeerConnection & DataChannel manager
│   └── components/
│       ├── Header.tsx           # Navigation header & live connection status pill
│       ├── PairingCard.tsx      # QR Code display, PIN generator & manual join card
│       ├── QRScannerModal.tsx   # Camera QR scanner using html5-qrcode
│       ├── SharePanel.tsx       # Text, URL, & image drag-and-drop input zone
│       ├── SharedFeed.tsx       # Live feed of shared items with copy/download
│       ├── AdUnit.tsx           # Safe Google AdSense unit placement renderer
│       ├── AdminPanel.tsx       # Protected AdSense management dashboard
│       └── DeploymentInstructionsModal.tsx # Built-in deployment guide
└── .env.example                 # Environment configuration template
```

---

## 📦 Setup & Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Local Development Server

Runs Express backend on port 3000 with attached Vite middleware and WebSocket server:

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🌐 Production Deployment

### Option A: Full-Stack Container (Cloud Run / Render)

Build and run as a single bundled container:

```bash
npm run build
npm run start
```

### Option B: Decoupled Frontend + Backend Deployment (100% Free Tiers)

1. **Deploy Backend Signaling Server (Render / Railway / Cloud Run)**:
   - Build Command: `npm run build`
   - Start Command: `npm run start`
   - Node Environment: `NODE_ENV=production`

2. **Deploy Frontend SPA (Vercel / Netlify)**:
   - Connect Git repository.
   - Build Command: `npm run build`
   - Publish Directory: `dist`

---

## 🔐 Environment Variables (`.env`)

See `.env.example` for full configuration:

- `ADMIN_USERNAME`: Username for `/admin` panel (Default: `admin`).
- `ADMIN_PASSWORD_HASH`: SHA-256 password hash for admin (Default: `admin123`).
- `ADMIN_JWT_SECRET`: Secret key for admin session tokens.
- `TURN_SERVER_URL`: Optional TURN server URL for strict corporate firewalls.

---

## 📢 Google AdSense Notice

Google AdSense account approval and ad-unit creation must be done separately on [Google's AdSense Dashboard](https://www.google.com/adsense). The integrated admin panel allows site owners to manage where already-created ad unit codes or slot IDs appear on LinkBeam without modifying source code.
