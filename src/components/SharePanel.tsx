import React, { useState, useRef } from 'react';
import { Send, Image as ImageIcon, Link as LinkIcon, UploadCloud, X, Check, FileText } from 'lucide-react';
import { SharedItemType } from '../types';

interface SharePanelProps {
  onSendText: (content: string) => void;
  onSendLink: (url: string, title?: string) => void;
  onSendImage: (file: File) => void;
  disabled?: boolean;
}

export const SharePanel: React.FC<SharePanelProps> = ({
  onSendText,
  onSendLink,
  onSendImage,
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [textInput, setTextInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Detect URL
  const isUrl = (str: string) => {
    try {
      const trimmed = str.trim();
      if (/^(http|https):\/\/[^ "]+$/.test(trimmed)) return true;
      if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/[^ "]*)*$/.test(trimmed)) return true;
    } catch {
      return false;
    }
    return false;
  };

  const handleSendTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || disabled) return;

    setSending(true);
    const trimmed = textInput.trim();
    if (isUrl(trimmed)) {
      const formattedUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
        ? trimmed 
        : `https://${trimmed}`;
      onSendLink(formattedUrl);
    } else {
      onSendText(trimmed);
    }

    setTextInput('');
    setTimeout(() => setSending(false), 200);
  };

  const handleImageFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB limit for real-time peer-to-peer transmission.');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSendImageClick = () => {
    if (!selectedImage || disabled) return;
    setSending(true);
    onSendImage(selectedImage);

    setTimeout(() => {
      setSelectedImage(null);
      setImagePreview(null);
      setSending(false);
    }, 300);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8 flex flex-col transition-all">
      <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">Beam Something</h2>

      {/* Sub-tabs: Text/Link vs Image */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'text'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          id="tab-send-text"
        >
          <FileText className="w-4 h-4" />
          <span>Note or Link</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('image')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'image'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          id="tab-send-image"
        >
          <ImageIcon className="w-4 h-4" />
          <span>Image or File</span>
        </button>
      </div>

      {/* TEXT / LINK INPUT MODE */}
      {activeTab === 'text' && (
        <form onSubmit={handleSendTextSubmit} className="space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Text or URL
            </label>
            <div className="relative">
              <textarea
                rows={5}
                disabled={disabled}
                placeholder="Paste a link, snippet, or note..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendTextSubmit(e);
                  }
                }}
                className="w-full p-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-indigo-500 outline-none transition-all resize-none text-slate-700 dark:text-slate-200 leading-relaxed placeholder:text-slate-400"
                id="share-text-input"
              />
              {isUrl(textInput) && (
                <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Link Detected</span>
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!textInput.trim() || disabled || sending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            id="send-text-btn"
          >
            <span>{sending ? 'Beaming...' : 'Beam Now'}</span>
            <Send className={`w-5 h-5 ${sending ? 'animate-bounce' : ''}`} />
          </button>
        </form>
      )}

      {/* IMAGE DROPZONE MODE */}
      {activeTab === 'image' && (
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleImageFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
            id="image-file-input"
          />

          {!imagePreview ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Image File
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleImageDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center group hover:border-indigo-400 transition-colors cursor-pointer ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
                id="image-dropzone"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                  <UploadCloud className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Drop images or files here
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Or click to browse from device (Max 15MB)
                </span>
              </div>
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 p-3 flex flex-col items-center">
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-slate-950/70 text-white hover:bg-slate-900 transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>

              <img
                src={imagePreview}
                alt="Upload preview"
                className="max-h-48 rounded-xl object-contain"
              />

              <div className="w-full mt-3 p-3 bg-slate-800/90 rounded-xl flex items-center justify-between text-xs text-slate-200">
                <div className="truncate max-w-[180px]">
                  <p className="font-semibold truncate">{selectedImage?.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {((selectedImage?.size || 0) / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedImage || disabled || sending}
            onClick={handleSendImageClick}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            id="send-image-btn"
          >
            <span>{sending ? 'Transferring...' : 'Beam Image'}</span>
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
