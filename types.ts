
export enum AppMode {
  HOME = 'HOME',
  CHAT = 'CHAT',
  LIVE = 'LIVE',
  NOTES = 'NOTES',
  STUDIO = 'STUDIO'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  thinking?: string;
  imageUrl?: string;
  sources?: Array<{ title: string; uri: string }>;
}

export interface MindMapNode {
  id: string;
  label: string;
  type: 'topic' | 'subtopic' | 'example' | 'tip' | 'mistake' | 'formula';
  content: string;
  hint?: {
    color: string;
    icon: string;
  };
  x?: number;
  y?: number;
}

export interface MindMapEdge {
  from: string;
  to: string;
  label: string;
}

export interface MindMapPage {
  page: number;
  summary: string;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface MindMapData {
  title: string;
  pages: MindMapPage[];
  renderHints: {
    nodeColor: string;
    icons: Record<string, string>;
  };
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '2:3' | '3:2' | '21:9';
