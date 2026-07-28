import React from 'react';
import { Wifi, WifiOff, Sun, Moon, Shield, BookOpen, Radio } from 'lucide-react';
import { ConnectionStatus, DeviceInfo } from '../types';

interface HeaderProps {
  status: ConnectionStatus;
  peerDeviceInfo?: DeviceInfo;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAdmin: () => void;
  onOpenDocs: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  peerDeviceInfo,
  isDarkMode,
  onToggleDarkMode,
  onOpenAdmin,
  onOpenDocs,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                LinkBeam
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                P2P
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
              Privacy-first cross-device share
            </p>
          </div>
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-3 sm:gap-4">
          {status === 'connected' ? (
            <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-800 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {peerDeviceInfo ? peerDeviceInfo.name : '2 Devices Active'}
              </span>
            </div>
          ) : status === 'connecting' ? (
            <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-950/60 px-4 py-2 rounded-full border border-amber-100 dark:border-amber-800 text-sm font-semibold text-amber-700 dark:text-amber-300 animate-pulse">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span>Pairing Peer...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800/80 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-semibold">
              <WifiOff className="w-4 h-4 text-slate-400" />
              <span>Unpaired</span>
            </div>
          )}

          {/* Quick Docs / Deploy Instructions */}
          <button
            onClick={onOpenDocs}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Deployment Guide & Architecture"
            id="docs-btn"
          >
            <BookOpen className="w-5 h-5" />
          </button>

          {/* Admin Panel Toggle */}
          <button
            onClick={onOpenAdmin}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Ad Management Admin"
            id="admin-btn"
          >
            <Shield className="w-5 h-5" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle theme"
            id="theme-toggle-btn"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};
