import { rulesApiClient } from "@/shared/lib/api/rulesApiClient";
import { ApiError } from "@/shared/lib/api/apiClient";
import type {
  DriveConnectionTestResult,
  DriveIntegrationConfig,
  DriveIntegrationConfigInput,
} from "@/features/integrations/types/driveIntegration.types";

export const driveIntegrationService = {
  async getConfig(): Promise<DriveIntegrationConfig | null> {
    const { data } = await rulesApiClient.get<DriveIntegrationConfig | null>(
      "/api/v1/integrations/google-drive",
    );
    return data;
  },

  async saveConfig(
    input: DriveIntegrationConfigInput,
  ): Promise<DriveIntegrationConfig> {
    const { data } = await rulesApiClient.put<DriveIntegrationConfig>(
      "/api/v1/integrations/google-drive",
      input,
    );
    return data;
  },

  async deleteConfig(): Promise<void> {
    await rulesApiClient.delete("/api/v1/integrations/google-drive");
  },

  async testConnection(): Promise<DriveConnectionTestResult> {
    const { data } = await rulesApiClient.post<DriveConnectionTestResult>(
      "/api/v1/integrations/google-drive/test",
    );
    return data;
  },

  /**
   * The service-account JSON never goes through the integration config
   * endpoint above — it's stored via the generic encrypted secrets API
   * (whatsaap-backend /api/v1/secrets), referenced by name. Create first;
   * fall back to rotate when a secret with that name already exists.
   */
  async saveCredentials(
    secretName: string,
    serviceAccountJson: string,
  ): Promise<void> {
    try {
      await rulesApiClient.post("/api/v1/secrets", {
        name: secretName,
        value: serviceAccountJson,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        await rulesApiClient.patch(`/api/v1/secrets/${secretName}/rotate`, {
          value: serviceAccountJson,
        });
        return;
      }
      throw error;
    }
  },
};
