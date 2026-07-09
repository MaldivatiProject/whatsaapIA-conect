export interface ContactIdentity {
  id: string;
  tenant_id: string;
  session_id: string | null;
  lid_jid: string;
  phone_jid: string;
  display_name: string | null;
  enabled: boolean;
  created_at: string;
}

export interface ContactIdentityInput {
  session_id?: string | null;
  lid_jid: string;
  phone_jid: string;
  display_name?: string | null;
  enabled?: boolean;
}

export interface ContactIdentityUpdateInput {
  session_id?: string | null;
  lid_jid?: string;
  phone_jid?: string;
  display_name?: string | null;
  enabled?: boolean;
}

export interface ContactIdentityFormValues {
  sessionId: string;
  lidJid: string;
  phoneJid: string;
  displayName: string;
  enabled: boolean;
}

