export type IncomingShareType = 'text' | 'url' | 'audio' | 'image' | 'video' | 'file';
export type IncomingShareContentType = 'text' | 'audio' | 'image' | 'video' | 'file' | 'website' | null;

export interface IncomingShareRawPayload {
  value: string;
  shareType: IncomingShareType;
  mimeType?: string;
}

export interface IncomingShareResolvedPayload extends IncomingShareRawPayload {
  contentUri: string | null;
  contentType: IncomingShareContentType;
  contentMimeType: string | null;
  originalName: string | null;
  contentSize?: number | null;
}

export interface ShareIntakeResult {
  sharedPayloads: IncomingShareRawPayload[];
  resolvedSharedPayloads: IncomingShareResolvedPayload[];
  clearSharedPayloads: () => void;
  isResolving: boolean;
  error: Error | null;
  refreshSharePayloads: () => void;
}

export interface IncomingShareRequest {
  id: number;
  sharedPayloads: IncomingShareRawPayload[];
  resolvedSharedPayloads: IncomingShareResolvedPayload[];
}
