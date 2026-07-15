export type OverviewBucket = "hour" | "day";

export interface OverviewFilters {
  from?: string;
  to?: string;
  sessionId?: string;
  bucket?: OverviewBucket;
  limit?: number;
}

export interface OverviewRange {
  from: string;
  to: string;
  bucket: OverviewBucket;
}

export interface OverviewTotals {
  processed_messages: number;
  matched_messages: number;
  unmatched_messages: number;
  replies_sent_or_queued: number;
  failed_replies: number;
  pending_replies: number;
  completed_messages: number;
  unique_conversations: number;
  active_sessions: number;
  business_messages: number;
  match_rate: number;
  reply_rate: number;
  failure_rate: number;
}

export interface OverviewDelta {
  current: number;
  previous: number;
  change: number;
  change_percent: number | null;
}

export interface OverviewComparison {
  processed_messages: OverviewDelta;
  matched_messages: OverviewDelta;
  replies_sent_or_queued: OverviewDelta;
  failed_replies: OverviewDelta;
}

export interface OverviewTimeseriesPoint {
  bucket_start: string;
  processed_messages: number;
  matched_messages: number;
  replies_sent_or_queued: number;
  failed_replies: number;
  completed_messages: number;
  pending_replies: number;
}

export interface OverviewStatus {
  status: string;
  messages: number;
  replies_sent_or_queued: number;
  percentage: number;
}

export interface OverviewCategory {
  category: string;
  messages: number;
  matched_messages: number;
  replies_sent_or_queued: number;
  failed_replies: number;
  percentage: number;
}

export interface OverviewRule {
  rule_id: string;
  rule_name: string;
  category: string;
  matches: number;
  replies_sent_or_queued: number;
  failed_replies: number;
}

export interface OverviewSession {
  session_id: string;
  messages: number;
  matched_messages: number;
  replies_sent_or_queued: number;
  failed_replies: number;
  last_activity_at: string;
}

export interface OverviewRecentMessage {
  id: string;
  created_at: string;
  session_id: string;
  conversation_id: string;
  message_id: string;
  status: string;
  message_type: string;
  is_group: boolean;
  sender: string;
  raw_sender: string;
  matched_categories: string[];
  replies_sent_or_queued: number;
}

export interface OverviewPayload {
  generated_at: string;
  range: OverviewRange;
  totals: OverviewTotals;
  comparison: OverviewComparison;
  timeseries: OverviewTimeseriesPoint[];
  statuses: OverviewStatus[];
  categories: OverviewCategory[];
  rules: OverviewRule[];
  sessions: OverviewSession[];
  recent_messages: OverviewRecentMessage[];
}
