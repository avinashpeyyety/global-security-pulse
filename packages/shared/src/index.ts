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

export type FalloutRisk = 'low' | 'medium' | 'high' | 'critical';

export type PostureKind =
  | 'deployment'
  | 'exercise'
  | 'alert'
  | 'response'
  | 'buildup'
  | 'withdrawal';

export type PrecipitatePotential = 'low' | 'medium' | 'high' | 'critical';

export type SupplyRouteKind =
  | 'oil-chokepoint'
  | 'trade-chokepoint'
  | 'oil-route'
  | 'alt-route';

export interface SecurityEvent {
  id: string;
  title: string;
  summary: string;
  layer: EventLayer;
  severity: Severity;
  /** Fall-out / cascading risk level; colors map markers. Derived from severity if omitted. */
  falloutRisk?: FalloutRisk;
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

/** Military / strategic posture change — not a kinetic "recorded event". */
export interface MilitaryPosture {
  id: string;
  title: string;
  summary: string;
  kind: PostureKind;
  actors: string[];
  /** What this may be responding to, if known */
  inResponseTo?: string;
  precipitatePotential: PrecipitatePotential;
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
  postures?: MilitaryPosture[];
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

export const FALLOUT_LEVELS: FalloutRisk[] = ['low', 'medium', 'high', 'critical'];

/** Ordered risk colors: low=cool/muted → critical=bright red/magenta */
export const RISK_COLORS: Record<FalloutRisk, string> = {
  low: '#5b7c99',
  medium: '#f0c14b',
  high: '#fb923c',
  critical: '#ff2d6a',
};

export const FALLOUT_LABELS: Record<FalloutRisk, string> = {
  low: 'Low fallout',
  medium: 'Medium fallout',
  high: 'High fallout',
  critical: 'Critical fallout',
};

export const PRECIPITATE_LABELS: Record<PrecipitatePotential, string> = {
  low: 'Low precipitate potential',
  medium: 'Medium precipitate potential',
  high: 'High precipitate potential',
  critical: 'Critical precipitate potential',
};

/** Supply route kind → distinct line color */
export const ROUTE_KIND_COLORS: Record<string, string> = {
  'oil-chokepoint': '#fbbf24',
  'oil-route': '#f59e0b',
  'trade-chokepoint': '#38bdf8',
  'alt-route': '#34d399',
};

export const ROUTE_KIND_LABELS: Record<string, string> = {
  'oil-chokepoint': 'Oil chokepoint',
  'oil-route': 'Oil route',
  'trade-chokepoint': 'Trade chokepoint',
  'alt-route': 'Alt route',
};

/** Map severity 1–5 → fallout risk band */
export function severityToFallout(severity: number): FalloutRisk {
  if (severity >= 5) return 'critical';
  if (severity >= 4) return 'high';
  if (severity >= 3) return 'medium';
  return 'low';
}

export function eventFalloutRisk(e: Pick<SecurityEvent, 'severity' | 'falloutRisk'>): FalloutRisk {
  return e.falloutRisk ?? severityToFallout(e.severity);
}
