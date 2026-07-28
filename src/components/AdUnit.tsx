import React, { useEffect, useState } from 'react';
import { AdPlacement } from '../types';

/**
 * NOTE ON GOOGLE ADSENSE INTEGRATION:
 * Actual AdSense account approval and ad-unit creation MUST be done separately
 * on Google's AdSense dashboard (https://www.google.com/adsense).
 * 
 * This component and the LinkBeam admin panel manage where your already-created ad unit
 * codes or slot IDs are inserted into the site layout without hardcoding them into components.
 */

interface AdUnitProps {
  placementId: 'header_banner' | 'sidebar' | 'footer';
  className?: string;
}

export const AdUnit: React.FC<AdUnitProps> = ({ placementId, className = '' }) => {
  const [placement, setPlacement] = useState<AdPlacement | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/ads/public-config')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.placements?.[placementId]) {
          setPlacement(data.placements[placementId]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load ad config:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [placementId]);

  if (!placement || !placement.enabled) {
    return null;
  }

  return (
    <div className={`ad-container my-4 text-center overflow-hidden transition-all duration-300 ${className}`} id={`ad-slot-${placementId}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 font-mono">
        Advertisement
      </div>
      
      {/* Google AdSense Ins Block */}
      <div className="bg-slate-100/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-2 min-h-[90px] flex items-center justify-center">
        {placement.codeSnippet ? (
          <div
            dangerouslySetInnerHTML={{ __html: placement.codeSnippet }}
            className="w-full flex justify-center"
          />
        ) : (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%' }}
            data-ad-client={placement.clientPublisherId || 'ca-pub-1234567890123456'}
            data-ad-slot={placement.slotId || '1234567890'}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )}
      </div>
    </div>
  );
};
