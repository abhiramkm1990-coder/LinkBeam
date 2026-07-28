export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'expired' | 'error';

export interface DeviceInfo {
  name: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
}

export type SharedItemType = 'text' | 'link' | 'image';

export interface BaseSharedItem {
  id: string;
  type: SharedItemType;
  timestamp: number;
  senderName: string;
  isSelf: boolean;
}

export interface TextSharedItem extends BaseSharedItem {
  type: 'text';
  content: string;
}

export interface LinkSharedItem extends BaseSharedItem {
  type: 'link';
  url: string;
  title?: string;
}

export interface ImageSharedItem extends BaseSharedItem {
  type: 'image';
  dataUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export type SharedItem = TextSharedItem | LinkSharedItem | ImageSharedItem;

export interface AdPlacement {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  clientPublisherId: string;
  slotId: string;
  codeSnippet: string;
}

export interface AdConfig {
  placements: Record<string, AdPlacement>;
  lastUpdated: string;
}

export interface SessionData {
  sessionId: string;
  pin: string;
  role: 'host' | 'peer';
  peerDeviceInfo?: DeviceInfo;
}
