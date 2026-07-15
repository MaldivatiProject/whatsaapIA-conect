export interface DriveIntegrationConfig {
  tenant_id: string;
  file_id: string;
  credentials_secret_name: string;
  enabled: boolean;
  cache_ttl_seconds: number;
  updated_at: string;
  has_credentials: boolean;
}

export interface DriveIntegrationConfigInput {
  file_id: string;
  credentials_secret_name: string;
  enabled: boolean;
  cache_ttl_seconds: number;
}

export interface DriveConnectionTestResult {
  ok: boolean;
  name?: string | null;
  mime_type?: string | null;
  modified_time?: string | null;
  preview?: string | null;
  error?: string | null;
}

export interface DriveIntegrationFormValues {
  fileId: string;
  credentialsSecretName: string;
  enabled: boolean;
  cacheTtlSeconds: number;
  serviceAccountJson: string;
}
