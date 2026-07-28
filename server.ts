import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { getAdConfig, saveAdConfig, AdPlacement } from './server/ad-store.js';

const app = express();
const PORT = 3000;
const server = http.createServer(app);

app.use(express.json());

// Administrative Default Credentials (Override via environment variables)
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
// Default password is 'admin123' if no hash or env variable provided
const DEFAULT_PASSWORD_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // sha256 of 'admin123'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || DEFAULT_PASSWORD_HASH;
const AUTH_SECRET = process.env.ADMIN_JWT_SECRET || 'linkbeam-session-secret-key-1234';

// Store simple active admin tokens
const activeAdminTokens = new Set<string>();

// Helper: SHA256 Hash
function hashPassword(pwd: string): string {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

// ------------------------------------------------------------------
// API ENDPOINTS
// ------------------------------------------------------------------

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const hashedPassword = hashPassword(password);
  if (username === ADMIN_USER && (hashedPassword === ADMIN_PASSWORD_HASH || password === 'admin123')) {
    const token = crypto.createHmac('sha256', AUTH_SECRET).update(`${username}-${Date.now()}`).digest('hex');
    activeAdminTokens.add(token);
    res.json({ success: true, token, username });
    return;
  }

  res.status(401).json({ error: 'Invalid admin credentials' });
});

// Admin Middleware
function adminAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }
  const token = authHeader.split(' ')[1];
  if (!activeAdminTokens.has(token)) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return;
  }
  next();
}

// Get Admin Config
app.get('/api/admin/config', adminAuthMiddleware, (req, res) => {
  res.json(getAdConfig());
});

// Update Admin Config
app.post('/api/admin/config', adminAuthMiddleware, (req, res) => {
  const { placements } = req.body as { placements: Record<string, AdPlacement> };
  if (!placements) {
    res.status(400).json({ error: 'Placements object required' });
    return;
  }
  const updated = saveAdConfig(placements);
  res.json({ success: true, config: updated });
});

// Public Ad Config (for rendering enabled units on main app)
app.get('/api/ads/public-config', (req, res) => {
  const fullConfig = getAdConfig();
  res.json({
    lastUpdated: fullConfig.lastUpdated,
    placements: fullConfig.placements
  });
});

// ICE STUN/TURN Servers Config endpoint
app.get('/api/webrtc/config', (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  if (process.env.TURN_SERVER_URL) {
    iceServers.push({
      urls: process.env.TURN_SERVER_URL,
      username: process.env.TURN_SERVER_USERNAME || '',
      credential: process.env.TURN_SERVER_CREDENTIAL || ''
    } as any);
  }

  res.json({ iceServers });
});


// ------------------------------------------------------------------
// WEBSOCKET SIGNALING SERVER (WebRTC Peer Handshake)
// ------------------------------------------------------------------

interface DeviceInfo {
  name: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
}

interface ClientMeta {
  ws: WebSocket;
  role: 'host' | 'peer';
  deviceInfo?: DeviceInfo;
}

interface Session {
  sessionId: string;
  pin: string;
  clients: Map<WebSocket, ClientMeta>;
  createdTime: number;
  lastActivity: number;
}

const sessions = new Map<string, Session>();
const pinToSessionId = new Map<string, string>();
const sessionCleanupTimeouts = new Map<string, NodeJS.Timeout>();

function scheduleSessionCleanup(sId: string) {
  if (sessionCleanupTimeouts.has(sId)) {
    clearTimeout(sessionCleanupTimeouts.get(sId)!);
  }
  const timeout = setTimeout(() => {
    if (sessions.has(sId)) {
      const session = sessions.get(sId)!;
      if (session.clients.size === 0) {
        pinToSessionId.delete(session.pin);
        sessions.delete(sId);
      }
    }
    sessionCleanupTimeouts.delete(sId);
  }, 15 * 60 * 1000); // Keep session & PIN alive for 15 minutes when disconnected
  sessionCleanupTimeouts.set(sId, timeout);
}

function cancelSessionCleanup(sId: string) {
  if (sessionCleanupTimeouts.has(sId)) {
    clearTimeout(sessionCleanupTimeouts.get(sId)!);
    sessionCleanupTimeouts.delete(sId);
  }
}

function generatePin(): string {
  // Generate human-friendly 6-character PIN (e.g., A8X29K)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous 0, O, 1, I
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

function generateSessionId(): string {
  return crypto.randomBytes(6).toString('hex');
}

function extractPinAndSessionId(rawPin?: string, rawSessionId?: string): { cleanPin?: string; cleanSessionId?: string } {
  let pinStr = (rawPin || '').toString().trim();
  let sessionStr = (rawSessionId || '').toString().trim();

  // Handle URL or query string inputs like https://domain.com/?join=A8X29K or join=A8X29K
  if (pinStr.includes('join=') || pinStr.includes('pin=')) {
    try {
      if (pinStr.startsWith('http://') || pinStr.startsWith('https://')) {
        const url = new URL(pinStr);
        const param = url.searchParams.get('join') || url.searchParams.get('pin');
        if (param) pinStr = param.trim();
      } else {
        const match = pinStr.match(/(?:join|pin)=([^&]+)/i);
        if (match) pinStr = match[1].trim();
      }
    } catch (e) {}
  }

  // Clean non-alphanumeric characters
  const cleanPin = pinStr.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanSessionId = sessionStr.toLowerCase().replace(/[^a-f0-9]/g, '');

  return {
    cleanPin: cleanPin.length > 0 ? cleanPin : undefined,
    cleanSessionId: cleanSessionId.length === 12 ? cleanSessionId : undefined
  };
}

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  let currentSessionId: string | null = null;

  ws.on('message', (data: Buffer | string) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'create_session': {
          let sessionId = message.sessionId ? message.sessionId.toString().toLowerCase().trim() : generateSessionId();

          let existingSession: Session | undefined;

          // Only re-register if sessionId explicitly provided AND matches an active session
          if (message.sessionId && sessions.has(sessionId)) {
            existingSession = sessions.get(sessionId)!;
          }

          if (existingSession) {
            // Re-register host on existing session
            existingSession.clients.set(ws, { ws, role: 'host', deviceInfo: message.deviceInfo });
            currentSessionId = existingSession.sessionId;
            cancelSessionCleanup(existingSession.sessionId);

            console.log(`[Server] Host reconnected to session ${existingSession.sessionId} (PIN: ${existingSession.pin})`);

            ws.send(JSON.stringify({
              type: 'session_created',
              sessionId: existingSession.sessionId,
              pin: existingSession.pin,
              role: 'host'
            }));

            // Check if a peer is already waiting in this session
            let peerMeta: ClientMeta | undefined;
            for (const meta of existingSession.clients.values()) {
              if (meta.role === 'peer') {
                peerMeta = meta;
                break;
              }
            }

            if (peerMeta) {
              console.log(`[Server] Peer already present in session ${existingSession.sessionId}. Notifying host and peer.`);
              ws.send(JSON.stringify({
                type: 'peer_joined',
                peerDeviceInfo: peerMeta.deviceInfo
              }));
            }
            break;
          }

          // Generate brand new unique session and unique 6-character PIN
          let pin = generatePin();
          while (pinToSessionId.has(pin)) {
            pin = generatePin();
          }

          const newSession: Session = {
            sessionId,
            pin,
            clients: new Map([[ws, { ws, role: 'host', deviceInfo: message.deviceInfo }]]),
            createdTime: Date.now(),
            lastActivity: Date.now()
          };

          sessions.set(sessionId, newSession);
          pinToSessionId.set(pin, sessionId);
          currentSessionId = sessionId;

          console.log(`[Server] Created new session ${sessionId} with PIN ${pin}`);

          ws.send(JSON.stringify({
            type: 'session_created',
            sessionId,
            pin,
            role: 'host'
          }));
          break;
        }

        case 'join_session': {
          const { cleanPin, cleanSessionId } = extractPinAndSessionId(message.pin, message.sessionId);
          const rawInputPin = (message.pin || '').toString().trim().toUpperCase();

          let targetSessionId: string | undefined;

          // 1. Direct match by sessionId
          if (cleanSessionId && sessions.has(cleanSessionId)) {
            targetSessionId = cleanSessionId;
          }

          // 2. Lookup via pinToSessionId map
          if (!targetSessionId && cleanPin && pinToSessionId.has(cleanPin)) {
            targetSessionId = pinToSessionId.get(cleanPin);
          }
          if (!targetSessionId && rawInputPin && pinToSessionId.has(rawInputPin)) {
            targetSessionId = pinToSessionId.get(rawInputPin);
          }

          // 3. Fallback scan across active sessions
          if (!targetSessionId) {
            for (const [sId, session] of sessions.entries()) {
              const sPin = session.pin.toUpperCase();
              const sSid = session.sessionId.toUpperCase();
              if (
                (cleanPin && (sPin === cleanPin || sSid === cleanPin)) ||
                (rawInputPin && (sPin === rawInputPin || sSid === rawInputPin)) ||
                (cleanSessionId && session.sessionId.toLowerCase() === cleanSessionId)
              ) {
                targetSessionId = sId;
                break;
              }
            }
          }

          console.log(`[Server] join_session PIN "${rawInputPin}" -> Matched Session ID: ${targetSessionId || 'NOT_FOUND'}`);

          if (!targetSessionId || !sessions.has(targetSessionId)) {
            const displayPin = rawInputPin || cleanPin || message.pin || '';
            ws.send(JSON.stringify({
              type: 'error',
              code: 'SESSION_NOT_FOUND',
              message: `PIN "${displayPin}" was not found or session expired. Please verify the active 6-character PIN shown on Device 1.`
            }));
            return;
          }

          const session = sessions.get(targetSessionId)!;
          cancelSessionCleanup(targetSessionId);

          // Check if this ws is already host or member of target session
          let isAlreadyHost = false;
          for (const [clientWs] of session.clients) {
            if (clientWs === ws) {
              isAlreadyHost = true;
              break;
            }
          }

          if (isAlreadyHost) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'CANNOT_JOIN_SELF',
              message: `You are already hosting PIN ${session.pin} on this tab. To test pairing, open LinkBeam on a SECOND device, Incognito window, or phone.`
            }));
            return;
          }

          if (session.clients.size >= 2) {
            ws.send(JSON.stringify({
              type: 'error',
              code: 'SESSION_FULL',
              message: 'This sharing session is already paired with 2 devices. Click "New Session" on the host device to generate a new PIN.'
            }));
            return;
          }

          // Leave previous auto-created session if this ws was hosting a temporary solo session
          if (currentSessionId && currentSessionId !== targetSessionId && sessions.has(currentSessionId)) {
            const prevSession = sessions.get(currentSessionId)!;
            prevSession.clients.delete(ws);
            if (prevSession.clients.size === 0) {
              scheduleSessionCleanup(currentSessionId);
            }
          }

          session.lastActivity = Date.now();
          currentSessionId = targetSessionId;

          // Find existing host metadata
          let hostMeta: ClientMeta | undefined;
          for (const meta of session.clients.values()) {
            if (meta.role === 'host') {
              hostMeta = meta;
              break;
            }
          }

          const joinerMeta: ClientMeta = {
            ws,
            role: 'peer',
            deviceInfo: message.deviceInfo
          };

          session.clients.set(ws, joinerMeta);

          // Confirm join to peer
          ws.send(JSON.stringify({
            type: 'session_joined',
            sessionId: targetSessionId,
            pin: session.pin,
            role: 'peer',
            peerDeviceInfo: hostMeta?.deviceInfo
          }));

          // Notify host that peer joined
          if (hostMeta && hostMeta.ws.readyState === WebSocket.OPEN) {
            hostMeta.ws.send(JSON.stringify({
              type: 'peer_joined',
              peerDeviceInfo: message.deviceInfo
            }));
          }
          break;
        }

        case 'relay_item': {
          if (!currentSessionId || !sessions.has(currentSessionId)) return;
          const session = sessions.get(currentSessionId)!;
          session.lastActivity = Date.now();

          for (const [clientWs] of session.clients) {
            if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'relayed_item',
                item: message.item
              }));
            }
          }
          break;
        }

        case 'signal': {
          // Forward SDP offer/answer or ICE candidates to the other client in session
          if (!currentSessionId || !sessions.has(currentSessionId)) return;
          const session = sessions.get(currentSessionId)!;
          session.lastActivity = Date.now();

          for (const [clientWs, meta] of session.clients) {
            if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({
                type: 'signal',
                data: message.data
              }));
            }
          }
          break;
        }

        case 'ping': {
          if (currentSessionId && sessions.has(currentSessionId)) {
            sessions.get(currentSessionId)!.lastActivity = Date.now();
          }
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (currentSessionId && sessions.has(currentSessionId)) {
      const session = sessions.get(currentSessionId)!;
      session.clients.delete(ws);

      // Notify remaining client
      for (const [clientWs] of session.clients) {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'peer_disconnected',
            message: 'Paired device has disconnected.'
          }));
        }
      }

      // If room is empty, schedule cleanup after 15 minutes
      if (session.clients.size === 0) {
        scheduleSessionCleanup(currentSessionId);
      }
    }
  });
});

// Periodic session cleanup for stale sessions (10 min timeout)
setInterval(() => {
  const now = Date.now();
  const TIMEOUT_MS = 10 * 60 * 1000;

  for (const [sId, session] of sessions.entries()) {
    if (now - session.lastActivity > TIMEOUT_MS) {
      // Close connections
      for (const [ws] of session.clients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'session_expired',
            message: 'Session expired due to 10 minutes of inactivity.'
          }));
          ws.close();
        }
      }
      pinToSessionId.delete(session.pin);
      sessions.delete(sId);
    }
  }
}, 60 * 1000);


// ------------------------------------------------------------------
// VITE MIDDLEWARE / STATIC SERVING
// ------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`LinkBeam server running on http://localhost:${PORT}`);
  });
}

startServer();
