/** Mirrors whatsaap-backend's presentation/api/schemas.py BusinessMessageOut. */
export interface BusinessMessage {
  id: string;
  business_category: string;
  source_origin: string;
  processing_status: string;
  metadata: Record<string, unknown>;
  session_id: string | null;
  conversation_id: string | null;
  sender: string | null;
  received_at: string;
  created_by: string | null;
}

export interface BusinessMessageFilters {
  category?: string;
  limit?: number;
}
