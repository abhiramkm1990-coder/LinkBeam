import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import { QrCode, Copy, Check, ArrowRight, Camera, Smartphone, Laptop, Sparkles, RefreshCw } from 'lucide-react';
import { ConnectionStatus, DeviceInfo } from '../types';

interface PairingCardProps {
  sessionId: string | null;
  pin: string | null;
  status: ConnectionStatus;
  deviceInfo: DeviceInfo;
  onJoinSession: (pinOrSessionId: string) => void;
  onOpenScanner: () => void;
  onCreateNewSession: () => void;
}

export const PairingCard: React.FC<PairingCardProps> = ({
  sessionId,
  pin,
  status,
  deviceInfo,
  onJoinSession,
  onOpenScanner,
  onCreateNewSession,
}) => {
  const [inputPin, setInputPin] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');

  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const joinUrl = pin ? `${appUrl}/?join=${pin}` : (sessionId ? `${appUrl}/?join=${sessionId}` : '');

  const handleCopyPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPin.trim()) {
      onJoinSession(inputPin.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-all"
    >
      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 p-2 gap-2">
        <button
          onClick={() => setActiveTab('host')}
          className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === 'host'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          id="tab-share-device"
        >
          <QrCode className="w-4 h-4" />
          <span>Share This Device</span>
        </button>
        <button
          onClick={() => setActiveTab('join')}
          className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            activeTab === 'join'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700/60'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          id="tab-join-device"
        >
          <Smartphone className="w-4 h-4" />
          <span>Join Existing Session</span>
        </button>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* TAB 1: SHARE THIS DEVICE (Host QR + PIN) */}
        {activeTab === 'host' && (
          <div className="flex flex-col items-center text-center space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ready to Pair</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                Scan or Enter PIN to Pair
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Open LinkBeam on your phone or laptop and scan this QR code or type the 6-character PIN.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-inner">
              <div className="bg-white p-4 rounded-2xl shadow-md">
                {joinUrl ? (
                  <QRCodeSVG
                    value={joinUrl}
                    size={190}
                    level="H"
                    includeMargin={false}
                    fgColor="#1e1b4b"
                  />
                ) : (
                  <div className="w-[190px] h-[190px] flex items-center justify-center text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                )}
              </div>
            </div>

            {/* Pairing PIN Indigo Card */}
            <div className="w-full bg-indigo-900 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between text-white shadow-xl shadow-indigo-900/20 gap-4">
              <div className="text-center sm:text-left">
                <p className="text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
                  Pairing PIN
                </p>
                <p className="text-3xl font-mono font-bold tracking-[0.2em]">
                  {pin || '------'}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopyPin}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                  id="copy-pin-btn"
                >
                  {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPin ? 'Copied' : 'Copy PIN'}</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-indigo-950/40"
                  id="copy-link-btn"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
                </button>

                {joinUrl && (
                  <button
                    onClick={() => window.open(joinUrl, '_blank')}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/40"
                    id="open-test-tab-btn"
                    title="Open a second tab to test instant pairing"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Test Pair Tab</span>
                  </button>
                )}
              </div>
            </div>

            {/* Current Device Identifier */}
            <div className="flex items-center justify-between w-full text-xs text-slate-500 dark:text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                {deviceInfo.deviceType === 'mobile' ? (
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Laptop className="w-4 h-4 text-indigo-600" />
                )}
                <span>Device: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{deviceInfo.name}</strong></span>
              </div>
              <button
                onClick={onCreateNewSession}
                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                title="Generate new PIN"
              >
                <RefreshCw className="w-3 h-3" />
                <span>New Session</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: JOIN EXISTING SESSION */}
        {activeTab === 'join' && (
          <div className="flex flex-col items-center text-center space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                Connect to a Device
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Enter the 6-character PIN shown on your second device, or scan its QR code using your camera.
              </p>
            </div>

            {/* Camera QR Scanner Button */}
            <button
              onClick={onOpenScanner}
              className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3 text-sm transition-all"
              id="camera-scan-btn"
            >
              <Camera className="w-5 h-5" />
              <span>Scan QR Code with Camera</span>
            </button>

            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
              <span className="text-xs font-bold uppercase text-slate-400 tracking-widest">or enter pin</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"></div>
            </div>

            {/* Manual PIN Form */}
            <form onSubmit={handleJoinSubmit} className="w-full space-y-4">
              <div>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="e.g. 829104"
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value.toUpperCase())}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-center text-2xl font-mono tracking-[0.2em] font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none uppercase placeholder:text-slate-300 placeholder:font-sans placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
                  id="pin-input-field"
                />
              </div>

              <button
                type="submit"
                disabled={!inputPin.trim()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                id="connect-pin-btn"
              >
                <span>Beam Pair</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </motion.div>
  );
};
