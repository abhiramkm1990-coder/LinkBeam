import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wifi, CheckCircle2, AlertCircle, RefreshCw, Radio, Sparkles, Smartphone, ShieldAlert } from 'lucide-react';
import { Header } from './components/Header';
import { PairingCard } from './components/PairingCard';
import { SharePanel } from './components/SharePanel';
import { SharedFeed } from './components/SharedFeed';
import { QRScannerModal } from './components/QRScannerModal';
import { AdminPanel } from './components/AdminPanel';
import { DeploymentInstructionsModal } from './components/DeploymentInstructionsModal';
import { AdUnit } from './components/AdUnit';
import { ConnectionStatus, DeviceInfo, SharedItem } from './types';
import { getDeviceInfo } from './lib/device';
import { LinkBeamPeer } from './lib/webrtc';

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const [peerDeviceInfo, setPeerDeviceInfo] = useState<DeviceInfo | undefined>(undefined);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Theme & Modals
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [showConnectedToast, setShowConnectedToast] = useState(false);

  const device = useRef<DeviceInfo>(getDeviceInfo());
  const peerRef = useRef<LinkBeamPeer | null>(null);

  // Sync Dark Mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Initialize WebRTC & Handle URL Query parameters (e.g. ?join=SESSION_ID)
  useEffect(() => {
    const peer = new LinkBeamPeer({
      deviceInfo: device.current,
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'connected') {
          setShowConnectedToast(true);
          setTimeout(() => setShowConnectedToast(false), 4000);
        }
      },
      onSessionCreated: (sId, p) => {
        setSessionId(sId);
        setPin(p);
      },
      onSessionJoined: (sId, p, role, pDevice) => {
        setSessionId(sId);
        setPin(p);
        if (pDevice) setPeerDeviceInfo(pDevice);
      },
      onPeerJoined: (pDevice) => {
        setPeerDeviceInfo(pDevice);
      },
      onPeerDisconnected: () => {
        setErrorMessage('Paired device disconnected.');
      },
      onMessageReceived: (newItem) => {
        setSharedItems((prev) => [newItem, ...prev]);
      },
      onError: (msg) => {
        setErrorMessage(msg);
      },
    });

    peerRef.current = peer;

    // Connect WebSocket
    peer.initWebSocket().then(() => {
      // Check query string for join param
      const params = new URLSearchParams(window.location.search);
      const joinParam = params.get('join') || params.get('pin');

      if (joinParam) {
        peer.joinSession(joinParam);
      } else {
        peer.createSession();
      }
    });

    return () => {
      peer.close();
    };
  }, []);

  const handleCreateNewSession = () => {
    setSharedItems([]);
    setErrorMessage(null);
    setPeerDeviceInfo(undefined);
    peerRef.current?.createSession(true);
  };

  const handleJoinSession = (inputPin: string) => {
    setErrorMessage(null);
    peerRef.current?.joinSession(inputPin);
  };

  const handleSendText = (content: string) => {
    const newItem = peerRef.current?.sendText(content);
    if (newItem) {
      setSharedItems((prev) => [newItem, ...prev]);
    }
  };

  const handleSendLink = (url: string, title?: string) => {
    const newItem = peerRef.current?.sendLink(url, title);
    if (newItem) {
      setSharedItems((prev) => [newItem, ...prev]);
    }
  };

  const handleSendImage = async (file: File) => {
    const newItem = await peerRef.current?.sendImage(file);
    if (newItem) {
      setSharedItems((prev) => [newItem, ...prev]);
    }
  };

  const handleClearFeed = () => {
    setSharedItems([]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Ad Banner Placement */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-3">
        <AdUnit placementId="header_banner" />
      </div>

      {/* Main Navigation Header */}
      <Header
        status={status}
        peerDeviceInfo={peerDeviceInfo}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-10 py-8 flex flex-col items-center">
        {/* Error / Alert Banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-xl mb-6 p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 font-bold underline text-xs"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connected Success Toast */}
        <AnimatePresence>
          {showConnectedToast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              className="w-full max-w-xl mb-6 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center justify-between text-xs sm:text-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold">Devices Connected!</p>
                  <p className="text-emerald-100 text-xs">
                    Paired with {peerDeviceInfo ? peerDeviceInfo.name : 'second device'}. Stream text, links, or images instantly.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* UNPAIRED / INITIAL PAIRING FLOW */}
        {status !== 'connected' && (
          <div className="w-full max-w-xl space-y-6 my-auto py-6">
            <PairingCard
              sessionId={sessionId}
              pin={pin}
              status={status}
              deviceInfo={device.current}
              onJoinSession={handleJoinSession}
              onOpenScanner={() => setIsScannerOpen(true)}
              onCreateNewSession={handleCreateNewSession}
            />

            {/* How It Works Steps Pill */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 grid grid-cols-3 gap-2 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold shadow-sm">
              <div className="flex flex-col items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold font-mono text-xs flex items-center justify-center">1</span>
                <span>Scan or PIN</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold font-mono text-xs flex items-center justify-center">2</span>
                <span>P2P Connect</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <span className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold font-mono text-xs flex items-center justify-center">3</span>
                <span>Beam Files</span>
              </div>
            </div>
          </div>
        )}

        {/* CONNECTED / ACTIVE TWO-COLUMN DASHBOARD */}
        {status === 'connected' && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Share Panel & Pairing Info */}
            <section className="lg:col-span-5 flex flex-col gap-6">
              <SharePanel
                onSendText={handleSendText}
                onSendLink={handleSendLink}
                onSendImage={handleSendImage}
              />

              {/* Active Pairing Card Info */}
              <div className="bg-indigo-900 rounded-3xl p-6 flex items-center justify-between text-white shadow-xl shadow-indigo-900/20">
                <div>
                  <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">Active Beam PIN</p>
                  <p className="text-3xl font-mono font-bold tracking-[0.2em]">{pin || '------'}</p>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-right">
                  <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">Paired Device</p>
                  <p className="text-sm font-semibold truncate max-w-[120px]">{peerDeviceInfo?.name || 'Device 2'}</p>
                </div>
              </div>

              {/* Sidebar Ad Slot */}
              <AdUnit placementId="sidebar" />
            </section>

            {/* Right Column: History Feed */}
            <section className="lg:col-span-7 flex flex-col">
              <SharedFeed
                items={sharedItems}
                onClearFeed={handleClearFeed}
                peerDeviceName={peerDeviceInfo?.name}
              />
            </section>
          </div>
        )}
      </main>

      {/* Bottom Ad Banner Placement */}
      <div className="max-w-7xl mx-auto w-full px-6">
        <AdUnit placementId="footer" />
      </div>

      {/* Footer Bar */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 sm:px-10 py-6 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">LinkBeam</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Zero-server privacy-first cross-device share</span>
          </div>

          <div className="flex items-center gap-6 font-semibold">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Deployment Setup
            </button>
            <button
              onClick={() => setIsAdminOpen(true)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              AdSense Admin
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedText) => {
          let clean = scannedText.trim();
          try {
            if (clean.startsWith('http://') || clean.startsWith('https://')) {
              const url = new URL(clean);
              const joinParam = url.searchParams.get('join') || url.searchParams.get('pin');
              if (joinParam) clean = joinParam.trim();
            }
          } catch (e) {}

          if (clean.includes('join=')) {
            const match = clean.match(/join=([^&]+)/);
            if (match) clean = match[1].trim();
          } else if (clean.includes('pin=')) {
            const match = clean.match(/pin=([^&]+)/);
            if (match) clean = match[1].trim();
          }

          handleJoinSession(clean);
        }}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      <DeploymentInstructionsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />
    </div>
  );
}
