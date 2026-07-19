import { rulesApiClient } from "@/shared/lib/api/rulesApiClient";
import type { CreateRuleInput, Rule, UpdateRuleInput } from "@/features/rules/types/rule.types";

export const rulesService = {
  async list(): Promise<Rule[]> {
    const { data } = await rulesApiClient.get<Rule[]>("/api/v1/rules");
    return data;
  },

  async create(input: CreateRuleInput): Promise<Rule> {
    const { data } = await rulesApiClient.post<Rule>("/api/v1/rules", input);
    return data;
  },

  async update(id: string, input: UpdateRuleInput): Promise<Rule> {
    const { data } = await rulesApiClient.patch<Rule>(`/api/v1/rules/${id}`, input);
    return data;
  },

  async remove(id: string): Promise<void> {
    await rulesApiClient.delete(`/api/v1/rules/${id}`);
  },

  async listDeleted(): Promise<Rule[]> {
    const { data } = await rulesApiClient.get<Rule[]>("/api/v1/rules/deleted");
    return data;
  },

  async restore(id: string): Promise<Rule> {
    const { data } = await rulesApiClient.post<Rule>(`/api/v1/rules/${id}/restore`);
    return data;
  },
};
