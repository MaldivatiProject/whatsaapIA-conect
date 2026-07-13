import { rulesApiClient } from "@/shared/lib/api/rulesApiClient";
import type {
  BusinessMessage,
  BusinessMessageFilters,
} from "@/features/business-messages/types/businessMessage.types";

export const businessMessagesService = {
  async list(filters?: BusinessMessageFilters): Promise<BusinessMessage[]> {
    const { data } = await rulesApiClient.get<BusinessMessage[]>("/api/v1/business-messages", {
      params: {
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.limit ? { limit: filters.limit } : {}),
      },
    });
    return data;
  },
};
