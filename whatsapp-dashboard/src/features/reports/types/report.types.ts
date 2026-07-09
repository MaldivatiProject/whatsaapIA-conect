export interface ReportFilters {
  from?: string;
  to?: string;
  sessionId?: string;
  limit?: number;
}

export interface ReportSummary {
  processed_messages: number;
  matched_messages: number;
  unmatched_messages: number;
  replies_sent_or_queued: number;
  failed_replies: number;
  pending_replies: number;
  completed_messages: number;
  by_status: Record<string, number>;
}

export interface ReportMatchedRule {
  rule_id: string;
  rule_name: string;
  category: string;
}

export interface ReportMessage {
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
  reply_to_jid: string;
  matched_rule_ids: string[];
  matched_categories: string[];
  matched_rules: ReportMatchedRule[];
  replies_sent_or_queued: number;
}

export interface ReportCategory {
  category: string;
  messages: number;
  matched_messages: number;
  replies_sent_or_queued: number;
  failed_replies: number;
}

export interface ReportRule {
  rule_id: string;
  rule_name: string;
  category: string;
  matches: number;
  replies_sent_or_queued: number;
  failed_replies: number;
}

export interface ReportDelivery {
  status: string;
  messages: number;
  replies_sent_or_queued: number;
}

export interface ReportsPayload {
  summary: ReportSummary;
  messages: ReportMessage[];
  categories: ReportCategory[];
  rules: ReportRule[];
  deliveries: ReportDelivery[];
}

