import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'qr-reader-container';

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
      return;
    }

    setIsInitializing(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode(containerId);
        scannerRef.current = html5Qrcode;

        const qrConfig = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        };

        const onScan = (decodedText: string) => {
          onScanSuccess(decodedText);
          if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {}).finally(() => {
              scannerRef.current = null;
              onClose();
            });
          }
        };

        // Attempt 1: Facing mode environment (back camera)
        try {
          await html5Qrcode.start({ facingMode: 'environment' }, qrConfig, onScan, () => {});
        } catch (e1) {
          // Attempt 2: Facing mode user (front camera / laptop webcam)
          try {
            await html5Qrcode.start({ facingMode: 'user' }, qrConfig, onScan, () => {});
          } catch (e2) {
            // Attempt 3: Get camera list and pick first camera
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length > 0) {
              await html5Qrcode.start(cameras[0].id, qrConfig, onScan, () => {});
            } else {
              throw new Error('No camera detected on this device.');
            }
          }
        }
        setIsInitializing(false);
      } catch (err: any) {
        console.error('Camera QR scanner error:', err);
        setError(err?.message || 'Unable to access camera. Please check camera permissions or enter PIN manually.');
        setIsInitializing(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
    };
  }, [isOpen, onClose, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Scan LinkBeam QR Code</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="p-4 flex flex-col items-center justify-center min-h-[300px] relative">
          {error ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-12 h-12 text-rose-500 mb-3 animate-bounce" />
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-colors"
              >
                Use Manual PIN Entry
              </button>
            </div>
          ) : (
            <>
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 z-10">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Requesting Camera Access...</p>
                </div>
              )}
              <div
                id={containerId}
                className="w-full max-w-[280px] rounded-xl overflow-hidden border-2 border-indigo-500/30 dark:border-indigo-400/30 shadow-inner"
              />
              <p className="mt-3 text-xs text-center text-slate-500 dark:text-slate-400">
                Point camera at QR code on second device
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
