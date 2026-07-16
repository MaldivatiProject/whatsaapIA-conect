import { rulesApiClient } from "@/shared/lib/api/rulesApiClient";
import type { SecuritySettings } from "@/features/rules/types/securitySettings.types";

export const securitySettingsService = {
  async get(): Promise<SecuritySettings> {
    const { data } = await rulesApiClient.get<SecuritySettings>("/api/v1/security-settings");
    return data;
  },

  async update(allowHardcodedScriptSecrets: boolean): Promise<SecuritySettings> {
    const { data } = await rulesApiClient.patch<SecuritySettings>("/api/v1/security-settings", {
      allow_hardcoded_script_secrets: allowHardcodedScriptSecrets,
    });
    return data;
  },
};
