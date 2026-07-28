import fs from 'fs';
import path from 'path';

export interface AdPlacement {
  id: string; // e.g., 'header_banner', 'sidebar', 'footer'
  name: string;
  description: string;
  enabled: boolean;
  clientPublisherId: string; // e.g. "ca-pub-1234567890123456"
  slotId: string; // e.g. "9876543210"
  codeSnippet: string; // Full ins tag or custom JS snippet
}

export interface AdConfig {
  placements: Record<string, AdPlacement>;
  lastUpdated: string;
}

const CONFIG_PATH = path.join(process.cwd(), 'ad-config.json');

const DEFAULT_CONFIG: AdConfig = {
  lastUpdated: new Date().toISOString(),
  placements: {
    header_banner: {
      id: 'header_banner',
      name: 'Header Banner',
      description: 'Horizontal banner displayed non-intrusively above the main app header.',
      enabled: false,
      clientPublisherId: 'ca-pub-1234567890123456',
      slotId: '1234567890',
      codeSnippet: '<!-- Google AdSense Header Banner -->\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="ca-pub-1234567890123456"\n     data-ad-slot="1234567890"\n     data-ad-format="auto"\n     data-full-width-responsive="true"></ins>'
    },
    sidebar: {
      id: 'sidebar',
      name: 'Sidebar Unit',
      description: 'Vertical ad box displayed alongside the sharing panel on wider desktop screens.',
      enabled: false,
      clientPublisherId: 'ca-pub-1234567890123456',
      slotId: '0987654321',
      codeSnippet: '<!-- Google AdSense Sidebar -->\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="ca-pub-1234567890123456"\n     data-ad-slot="0987654321"\n     data-ad-format="auto"></ins>'
    },
    footer: {
      id: 'footer',
      name: 'Footer Banner',
      description: 'Bottom banner unit below the active sharing history feed.',
      enabled: false,
      clientPublisherId: 'ca-pub-1234567890123456',
      slotId: '1122334455',
      codeSnippet: '<!-- Google AdSense Footer Banner -->\n<ins class="adsbygoogle"\n     style="display:block"\n     data-ad-client="ca-pub-1234567890123456"\n     data-ad-slot="1122334455"\n     data-ad-format="auto"\n     data-full-width-responsive="true"></ins>'
    }
  }
};

export function getAdConfig(): AdConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to read ad-config.json, falling back to defaults:', err);
  }
  return DEFAULT_CONFIG;
}

export function saveAdConfig(newPlacements: Record<string, AdPlacement>): AdConfig {
  const current = getAdConfig();
  const updated: AdConfig = {
    lastUpdated: new Date().toISOString(),
    placements: {
      ...current.placements,
      ...newPlacements
    }
  };

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save ad-config.json:', err);
  }

  return updated;
}
