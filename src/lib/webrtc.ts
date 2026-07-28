import { ConnectionStatus, DeviceInfo, SharedItem } from '../types';

export interface WebRTCOptions {
  deviceInfo: DeviceInfo;
  onStatusChange: (status: ConnectionStatus) => void;
  onSessionCreated: (sessionId: string, pin: string, role: 'host' | 'peer') => void;
  onSessionJoined: (sessionId: string, pin: string, role: 'peer', peerDeviceInfo?: DeviceInfo) => void;
  onPeerJoined: (peerDeviceInfo: DeviceInfo) => void;
  onPeerDisconnected: () => void;
  onMessageReceived: (item: SharedItem) => void;
  onError: (msg: string) => void;
}

export class LinkBeamPeer {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private options: WebRTCOptions;
  private role: 'host' | 'peer' = 'host';
  private sessionId: string | null = null;
  private pin: string | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  constructor(options: WebRTCOptions) {
    this.options = options;
  }

  private pingInterval: any = null;
  private reconnectTimer: any = null;
  private isClosed = false;

  // 1. Connect to Signaling WebSocket
  public async initWebSocket(): Promise<void> {
    try {
      // Fetch ICE Server Config from backend (includes STUN/TURN)
      const iceRes = await fetch('/api/webrtc/config').catch(() => null);
      if (iceRes && iceRes.ok) {
        const iceData = await iceRes.json();
        if (iceData.iceServers && Array.isArray(iceData.iceServers)) {
          this.iceServers = iceData.iceServers;
        }
      }
    } catch (e) {
      console.warn('Using default STUN fallback:', e);
    }

    return new Promise<void>((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
      }

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebRTC] Signaling WebSocket connected');
        if (this.pingInterval) clearInterval(this.pingInterval);
        
        // Send ping interval
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        // If reconnecting and already had a session, re-register
        if (this.role === 'host' && (this.sessionId || this.pin)) {
          console.log('[WebRTC] Re-registering host session after WS reconnect');
          this.createSession(false);
        } else if (this.role === 'peer' && (this.pin || this.sessionId)) {
          console.log('[WebRTC] Re-joining peer session after WS reconnect');
          this.joinSession(this.pin || this.sessionId!);
        }

        resolve();
      };

      this.ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await this.handleSignalingMessage(msg);
        } catch (err) {
          console.error('Failed to parse signaling message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        // Do not reject if already resolved earlier in reconnect
      };

      this.ws.onclose = () => {
        console.warn('[WebRTC] Signaling server WebSocket disconnected');
        if (this.pingInterval) clearInterval(this.pingInterval);

        // Auto-reconnect if not intentionally closed
        if (!this.isClosed) {
          if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            console.log('[WebRTC] Attempting WebSocket reconnect...');
            this.initWebSocket().catch(() => {});
          }, 2000);
        }
      };
    });
  }

  // Create new session (Host)
  public createSession(forceNew = false): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      setTimeout(() => this.createSession(forceNew), 300);
      return;
    }
    this.role = 'host';
    this.options.onStatusChange('connecting');

    if (forceNew) {
      this.sessionId = null;
      this.pin = null;
      try {
        sessionStorage.removeItem('lb_session_id');
        sessionStorage.removeItem('lb_pin');
      } catch (e) {}
    } else if (!this.sessionId || !this.pin) {
      try {
        this.sessionId = sessionStorage.getItem('lb_session_id');
        this.pin = sessionStorage.getItem('lb_pin');
      } catch (e) {}
    }

    this.ws.send(JSON.stringify({
      type: 'create_session',
      sessionId: this.sessionId || undefined,
      pin: this.pin || undefined,
      deviceInfo: this.options.deviceInfo
    }));
  }

  // Join existing session (Peer)
  public joinSession(pinOrSessionId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      setTimeout(() => this.joinSession(pinOrSessionId), 300);
      return;
    }
    this.role = 'peer';
    this.options.onStatusChange('connecting');

    let cleanInput = pinOrSessionId.trim();

    // Extract join param if full URL or query parameter passed
    if (cleanInput.includes('join=') || cleanInput.includes('pin=')) {
      try {
        if (cleanInput.startsWith('http://') || cleanInput.startsWith('https://')) {
          const u = new URL(cleanInput);
          const val = u.searchParams.get('join') || u.searchParams.get('pin');
          if (val) cleanInput = val.trim();
        } else {
          const match = cleanInput.match(/(?:join|pin)=([^&]+)/i);
          if (match) cleanInput = match[1].trim();
        }
      } catch (e) {}
    }

    const cleanAlphanumeric = cleanInput.replace(/[^a-zA-Z0-9]/g, '');
    const isSessionId = cleanAlphanumeric.length === 12 && /^[a-fA-F0-9]+$/.test(cleanAlphanumeric);

    this.ws.send(JSON.stringify({
      type: 'join_session',
      pin: cleanAlphanumeric.toUpperCase(),
      sessionId: isSessionId ? cleanAlphanumeric.toLowerCase() : undefined,
      deviceInfo: this.options.deviceInfo
    }));
  }

  // Handle incoming signaling messages
  private async handleSignalingMessage(msg: any) {
    switch (msg.type) {
      case 'session_created': {
        this.sessionId = msg.sessionId;
        this.pin = msg.pin;
        try {
          if (msg.sessionId) sessionStorage.setItem('lb_session_id', msg.sessionId);
          if (msg.pin) sessionStorage.setItem('lb_pin', msg.pin);
        } catch (e) {}
        this.options.onSessionCreated(msg.sessionId, msg.pin, 'host');
        break;
      }

      case 'session_joined': {
        this.sessionId = msg.sessionId;
        this.pin = msg.pin;
        this.options.onSessionJoined(msg.sessionId, msg.pin, 'peer', msg.peerDeviceInfo);
        this.options.onStatusChange('connected');
        // Peer receives host info -> setup PeerConnection and wait for offer
        this.setupPeerConnection();
        break;
      }

      case 'peer_joined': {
        this.options.onPeerJoined(msg.peerDeviceInfo);
        this.options.onStatusChange('connected');
        // Host creates WebRTC Offer and DataChannel
        await this.setupPeerConnection();
        this.createDataChannel();
        const offer = await this.pc!.createOffer();
        await this.pc!.setLocalDescription(offer);
        this.sendSignal({ type: 'offer', sdp: offer });
        break;
      }

      case 'signal': {
        const data = msg.data;
        if (!this.pc) await this.setupPeerConnection();

        if (data.type === 'offer') {
          await this.pc!.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await this.processPendingCandidates();
          const answer = await this.pc!.createAnswer();
          await this.pc!.setLocalDescription(answer);
          this.sendSignal({ type: 'answer', sdp: answer });
        } else if (data.type === 'answer') {
          await this.pc!.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await this.processPendingCandidates();
        } else if (data.candidate) {
          if (this.pc!.remoteDescription) {
            await this.pc!.addIceCandidate(new RTCIceCandidate(data.candidate)).catch((e) => console.warn(e));
          } else {
            this.pendingCandidates.push(data.candidate);
          }
        }
        break;
      }

      case 'relayed_item': {
        if (msg.item) {
          const item: SharedItem = msg.item;
          item.isSelf = false;
          this.options.onMessageReceived(item);
        }
        break;
      }

      case 'peer_disconnected': {
        this.options.onStatusChange('disconnected');
        this.options.onPeerDisconnected();
        break;
      }

      case 'error': {
        this.options.onStatusChange('error');
        this.options.onError(msg.message || 'An error occurred.');
        break;
      }
    }
  }

  private async processPendingCandidates(): Promise<void> {
    if (!this.pc || !this.pc.remoteDescription) return;
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((e) => console.warn(e));
      }
    }
  }

  private async setupPeerConnection(): Promise<void> {
    if (this.pc) return;

    this.pc = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({ candidate: event.candidate });
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      if (this.pc.iceConnectionState === 'connected' || this.pc.iceConnectionState === 'completed') {
        this.options.onStatusChange('connected');
      } else if (this.pc.iceConnectionState === 'failed') {
        // Fallback to relay status if WebRTC P2P failed
        this.options.onStatusChange('connected');
      }
    };

    // Answer side receives data channel
    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.bindDataChannelEvents();
    };
  }

  private createDataChannel(): void {
    if (!this.pc) return;
    this.dataChannel = this.pc.createDataChannel('linkbeam-channel', {
      ordered: true,
    });
    this.bindDataChannelEvents();
  }

  private bindDataChannelEvents(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      this.options.onStatusChange('connected');
    };

    this.dataChannel.onclose = () => {
      // Don't disconnect if WebSocket is still connected
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const item: SharedItem = JSON.parse(event.data);
        item.isSelf = false;
        this.options.onMessageReceived(item);
      } catch (err) {
        console.error('Failed to parse data channel message:', err);
      }
    };
  }

  private sendSignal(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'signal',
        data
      }));
    }
  }

  // Send message via DataChannel or fallback to WebSocket Relay
  private dispatchItem(item: SharedItem): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(JSON.stringify(item));
        return;
      } catch (e) {
        console.warn('DataChannel send failed, using WebSocket relay:', e);
      }
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'relay_item',
        item
      }));
    } else {
      this.options.onError('Connection lost. Unable to send item.');
    }
  }

  // ------------------------------------------------------------------
  // DATA TRANSMISSION METHODS
  // ------------------------------------------------------------------

  public sendText(content: string): SharedItem | null {
    const item: SharedItem = {
      id: Math.random().toString(36).substring(2, 11),
      type: 'text',
      content,
      timestamp: Date.now(),
      senderName: this.options.deviceInfo.name,
      isSelf: true,
    };

    this.dispatchItem(item);
    return item;
  }

  public sendLink(url: string, title?: string): SharedItem | null {
    const item: SharedItem = {
      id: Math.random().toString(36).substring(2, 11),
      type: 'link',
      url,
      title,
      timestamp: Date.now(),
      senderName: this.options.deviceInfo.name,
      isSelf: true,
    };

    this.dispatchItem(item);
    return item;
  }

  public async sendImage(file: File): Promise<SharedItem | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const item: SharedItem = {
          id: Math.random().toString(36).substring(2, 11),
          type: 'image',
          dataUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          timestamp: Date.now(),
          senderName: this.options.deviceInfo.name,
          isSelf: true,
        };

        this.dispatchItem(item);
        resolve(item);
      };
      reader.readAsDataURL(file);
    });
  }

  public close(): void {
    this.isClosed = true;
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
