import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check, Download, ExternalLink, Image as ImageIcon, FileText, Trash2, Maximize2, X } from 'lucide-react';
import { SharedItem } from '../types';

interface SharedFeedProps {
  items: SharedItem[];
  onClearFeed: () => void;
  peerDeviceName?: string;
}

export const SharedFeed: React.FC<SharedFeedProps> = ({
  items,
  onClearFeed,
  peerDeviceName = 'Paired Device',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadImage = (dataUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName || 'linkbeam-shared-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      {/* Feed Header & Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Recent Beams</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            History ({items.length})
          </span>
          {items.length > 0 && (
            <button
              onClick={onClearFeed}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
              id="clear-feed-btn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Feed Items Container */}
      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-500 mb-3">
            <FileText className="w-6 h-6 opacity-60" />
          </div>
          <p className="text-base font-bold text-slate-700 dark:text-slate-300">
            No beams yet
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
            Beam notes, links, or images from either paired device to populate history.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between group gap-4 transition-all"
              >
                {/* ITEM TYPE: LINK */}
                {item.type === 'link' && (
                  <>
                    <div className="flex gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
                        <ExternalLink className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate block"
                        >
                          {item.url}
                        </a>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Sent from {item.isSelf ? 'This Device' : peerDeviceName} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopy(item.id, item.url)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </>
                )}

                {/* ITEM TYPE: TEXT */}
                {item.type === 'text' && (
                  <>
                    <div className="flex gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <pre className="whitespace-pre-wrap break-words font-sans text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                          {item.content}
                        </pre>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Sent from {item.isSelf ? 'This Device' : peerDeviceName} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopy(item.id, item.content)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </>
                )}

                {/* ITEM TYPE: IMAGE */}
                {item.type === 'image' && (
                  <>
                    <div className="flex gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/60 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div
                          onClick={() => setLightboxImage(item.dataUrl)}
                          className="cursor-pointer group/img relative inline-block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800"
                        >
                          <img
                            src={item.dataUrl}
                            alt={item.fileName}
                            className="max-h-36 object-contain rounded-xl bg-slate-950"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Maximize2 className="w-5 h-5" />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.fileName}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Sent from {item.isSelf ? 'This Device' : peerDeviceName} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {((item.fileSize || 0) / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDownloadImage(item.dataUrl, item.fileName)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Shared image preview"
              className="max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
