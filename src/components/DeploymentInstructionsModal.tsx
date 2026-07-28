import React from 'react';
import { BookOpen, Terminal, Server, Globe, Shield, X, Copy, Check } from 'lucide-react';

interface DeploymentInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentInstructionsModal: React.FC<DeploymentInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Deployment & Architecture Guide</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          {/* Quick Overview */}
          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 rounded-2xl space-y-2">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>LinkBeam Production Architecture</span>
            </h4>
            <p className="text-indigo-800 dark:text-indigo-300 text-xs leading-relaxed">
              LinkBeam uses WebRTC data channels for privacy-first, zero-server-storage peer-to-peer sharing.
              The Node.js backend acts only as a WebSocket signaling relay for initial handshakes and ad settings storage.
            </p>
          </div>

          {/* Local Development */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-500" />
              <span>1. Local Development</span>
            </h4>
            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs relative group">
              <button
                onClick={() => copyToClipboard('npm install\nnpm run dev', 'local')}
                className="absolute top-2.5 right-2.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copy commands"
              >
                {copiedSection === 'local' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <p># 1. Install dependencies</p>
              <p className="text-indigo-400">npm install</p>
              <p className="mt-2"># 2. Run full-stack dev server (Express + WebSockets + Vite)</p>
              <p className="text-indigo-400">npm run dev</p>
            </div>
          </div>

          {/* Backend Free Deployment */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-500" />
              <span>2. Deploy Backend (Render / Cloud Run)</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deploy the Node.js Express & WebSocket server to Render (Free Web Service) or GCP Cloud Run:
            </p>
            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs relative group">
              <p># Build command:</p>
              <p className="text-indigo-400">npm run build</p>
              <p className="mt-2"># Start command:</p>
              <p className="text-indigo-400">npm run start</p>
            </div>
          </div>

          {/* Frontend Free Deployment */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              <span>3. Deploy Frontend (Vercel / Netlify)</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect your Git repository to Vercel or Netlify. Set output directory to <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">dist</code>.
            </p>
          </div>

          {/* TURN Fallback Config */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              <span>4. WebRTC TURN Server Fallback (Optional)</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Google's public STUN servers handle 85%+ of peer connections natively. For strict corporate firewalls or symmetric NATs, add free TURN credentials in <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.env</code> (e.g. from Metered.ca or Twilio).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
