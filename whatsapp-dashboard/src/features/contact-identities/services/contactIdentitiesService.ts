import { rulesApiClient } from "@/shared/lib/api/rulesApiClient";
import type {
  ContactIdentity,
  ContactIdentityInput,
  ContactIdentityUpdateInput,
} from "@/features/contact-identities/types/contactIdentity.types";

export const contactIdentitiesService = {
  async list(): Promise<ContactIdentity[]> {
    const { data } = await rulesApiClient.get<ContactIdentity[]>("/api/v1/contact-identities");
    return data;
  },

  async create(input: ContactIdentityInput): Promise<ContactIdentity> {
    const { data } = await rulesApiClient.post<ContactIdentity>(
      "/api/v1/contact-identities",
      input,
    );
    return data;
  },

  async update(id: string, input: ContactIdentityUpdateInput): Promise<ContactIdentity> {
    const { data } = await rulesApiClient.patch<ContactIdentity>(
      `/api/v1/contact-identities/${id}`,
      input,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await rulesApiClient.delete(`/api/v1/contact-identities/${id}`);
  },
};

