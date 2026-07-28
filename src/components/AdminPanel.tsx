import React, { useState, useEffect } from 'react';
import { Shield, Lock, CheckCircle, AlertCircle, Save, LogOut, Info, Eye, X } from 'lucide-react';
import { AdConfig, AdPlacement } from '../types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('linkbeam_admin_token'));
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [config, setConfig] = useState<AdConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch Admin Config if Token exists
  useEffect(() => {
    if (!token || !isOpen) return;

    setLoading(true);
    fetch('/api/admin/config', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session expired or invalid token');
        return res.json();
      })
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => {
        setToken(null);
        localStorage.removeItem('linkbeam_admin_token');
        setLoading(false);
      });
  }, [token, isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setToken(data.token);
      localStorage.setItem('linkbeam_admin_token', data.token);
      setPasswordInput('');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('linkbeam_admin_token');
    setConfig(null);
  };

  const handleTogglePlacement = (id: string) => {
    if (!config) return;
    const currentPlacement = config.placements[id];
    if (!currentPlacement) return;

    setConfig({
      ...config,
      placements: {
        ...config.placements,
        [id]: {
          ...currentPlacement,
          enabled: !currentPlacement.enabled,
        },
      },
    });
  };

  const handleUpdateField = (id: string, field: keyof AdPlacement, value: string) => {
    if (!config) return;
    const currentPlacement = config.placements[id];
    if (!currentPlacement) return;

    setConfig({
      ...config,
      placements: {
        ...config.placements,
        [id]: {
          ...currentPlacement,
          [field]: value,
        },
      },
    });
  };

  const handleSaveConfig = async () => {
    if (!config || !token) return;
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ placements: config.placements }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save config');

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg">
            <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>LinkBeam AdSense Admin</span>
          </div>

          <div className="flex items-center gap-2">
            {token && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center gap-1"
                title="Log out admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* AdSense Notice Banner */}
          <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-200">
            <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Google AdSense Integration Notice</p>
              <p className="text-indigo-700 dark:text-indigo-300 leading-relaxed">
                Actual Google AdSense account approval and ad-unit creation must be done separately on Google's AdSense dashboard (
                <a
                  href="https://www.google.com/adsense"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium hover:text-indigo-500"
                >
                  https://www.google.com/adsense
                </a>
                ). This admin dashboard manages where your already-created ad unit codes are inserted into LinkBeam.
              </p>
            </div>
          </div>

          {!token ? (
            /* LOGIN FORM */
            <form onSubmit={handleLogin} className="max-w-md mx-auto space-y-4 py-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Admin Authentication</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Default credentials: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">admin</code> / <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">admin123</code>
                </p>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
                id="admin-login-btn"
              >
                Login to Dashboard
              </button>
            </form>
          ) : (
            /* DASHBOARD: MANAGING AD PLACEMENTS */
            <div className="space-y-6">
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>AdSense placement configuration saved successfully!</span>
                </div>
              )}

              {saveError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {loading || !config ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading placement settings...</div>
              ) : (
                <div className="space-y-6">
                  {(Object.values(config.placements) as AdPlacement[]).map((placement) => (
                    <div
                      key={placement.id}
                      className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-4"
                    >
                      {/* Placement Header & Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {placement.name}
                            </h4>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                                placement.enabled
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                              }`}
                            >
                              {placement.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {placement.description}
                          </p>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlacement(placement.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            placement.enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              placement.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Publisher Client ID (data-ad-client)
                          </label>
                          <input
                            type="text"
                            value={placement.clientPublisherId}
                            onChange={(e) => handleUpdateField(placement.id, 'clientPublisherId', e.target.value)}
                            placeholder="ca-pub-1234567890123456"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Ad Slot ID (data-ad-slot)
                          </label>
                          <input
                            type="text"
                            value={placement.slotId}
                            onChange={(e) => handleUpdateField(placement.id, 'slotId', e.target.value)}
                            placeholder="1234567890"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Custom HTML/AdSense Code Snippet
                        </label>
                        <textarea
                          rows={3}
                          value={placement.codeSnippet}
                          onChange={(e) => handleUpdateField(placement.id, 'codeSnippet', e.target.value)}
                          placeholder="<ins class='adsbygoogle' ...></ins>"
                          className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all"
                      id="save-admin-config-btn"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Ad Placements</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
