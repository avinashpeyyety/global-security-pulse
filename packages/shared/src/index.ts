/** Shared types for Global Security Pulse v0.1 */

export type FeedStatusKind = 'Pass' | 'Fail' | 'Warn' | 'Not run';

export type EventLayer =
  | 'conflict'
  | 'cyber'
  | 'maritime'
  | 'sanctions'
  | 'terrorism'
  | 'unrest'
  | 'disaster';

export type Severity = 1 | 2 | 3 | 4 | 5;

export interface SecurityEvent {
  id: string;
  title: string;
  summary: string;
  layer: EventLayer;
  severity: Severity;
  confidence: number;
  lat: number;
  lon: number;
  region: string;
  source: string;
  sourceReliability: 'A' | 'B' | 'C' | 'D' | 'E';
  url?: string;
  observedAt: string;
  ingestedAt: string;
}

export interface Hotspot {
  region: string;
  count: number;
  maxSeverity: Severity;
  freshestSource: string;
  freshestAt: string;
  layers: EventLayer[];
}

export interface FeedStatus {
  id: string;
  name: string;
  status: FeedStatusKind;
  lastEvaluatedAt: string | null;
  detail?: string;
  rule?: string;
  snapshot?: string | null;
}

export interface EconPoint {
  t: string;
  v: number;
}

export interface EconSeries {
  id: string;
  name: string;
  unit: string;
  source: 'stooq' | 'yahoo' | 'fred' | 'seed';
  points: EconPoint[];
}

export interface Anomaly {
  seriesId: string;
  seriesName: string;
  zScore: number;
  pctChange1d: number;
  pctChange5d: number;
  pctChange20d: number;
  adverseStreak: number;
  latestValue: number;
  evaluatedAt: string;
  rule: string;
  snapshot: string;
}

export interface StressComposite {
  score: number;
  components: {
    equities: number;
    usd: number;
    vix: number;
    oil: number;
  };
  evaluatedAt: string;
  rule: string;
  snapshot: string;
}

export interface DashboardSnapshot {
  generatedAt: string;
  events: SecurityEvent[];
  hotspots: Hotspot[];
  feeds: FeedStatus[];
  series: EconSeries[];
  anomalies: Anomaly[];
  stress: StressComposite;
  timeWindows: Array<'6h' | '24h' | '7d' | '30d'>;
}

export const EVENT_LAYERS: EventLayer[] = [
  'conflict',
  'cyber',
  'maritime',
  'sanctions',
  'terrorism',
  'unrest',
  'disaster',
];

export const LAYER_LABELS: Record<EventLayer, string> = {
  conflict: 'Conflict',
  cyber: 'Cyber',
  maritime: 'Maritime',
  sanctions: 'Sanctions / Diplomacy',
  terrorism: 'Terrorism',
  unrest: 'Unrest',
  disaster: 'Disaster-adjacent',
};
