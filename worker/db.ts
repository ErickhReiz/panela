import { DEFAULT_CONFIG, EventConfig, Invitation, RsvpResponse } from "../src/shared/types";

/** Configuração salva no KV (versões antigas também guardavam a senha do painel). */
export type StoredConfig = EventConfig & { adminPassword?: string };

export class DB {
  constructor(private kv: KVNamespace) {}

  async getInviteIndex(): Promise<string[]> {
    return ((await this.kv.get("invites_index", "json")) as string[] | null) || [];
  }

  private async saveInviteIndex(index: string[]): Promise<void> {
    await this.kv.put("invites_index", JSON.stringify(index));
  }

  async getInvite(code: string): Promise<Invitation | null> {
    return (await this.kv.get(`invite:${code.toLowerCase().trim()}`, "json")) as Invitation | null;
  }

  async getAllInvites(): Promise<Invitation[]> {
    const index = await this.getInviteIndex();
    const results = await Promise.all(index.map(code => this.getInvite(code)));
    return results.filter((inv): inv is Invitation => inv !== null);
  }

  async saveInvite(invite: Invitation): Promise<Invitation> {
    invite.code = invite.code.toLowerCase().trim();
    invite.updatedAt = new Date().toISOString();
    invite.createdAt ||= invite.updatedAt;
    await this.kv.put(`invite:${invite.code}`, JSON.stringify(invite));

    const index = await this.getInviteIndex();
    if (!index.includes(invite.code)) {
      index.push(invite.code);
      await this.saveInviteIndex(index);
    }
    return invite;
  }

  async deleteInvite(code: string): Promise<void> {
    const clean = code.toLowerCase().trim();
    await this.kv.delete(`invite:${clean}`);
    const index = await this.getInviteIndex();
    await this.saveInviteIndex(index.filter(c => c !== clean));
  }

  async updateRSVP(
    code: string,
    responses: RsvpResponse[]
  ): Promise<{ success: boolean; invite?: Invitation; error?: string }> {
    const invite = await this.getInvite(code);
    if (!invite) return { success: false, error: "Convite não encontrado." };

    const now = new Date().toISOString();
    let updated = 0;
    for (const resp of responses) {
      const guest = invite.guests.find(g => g.id === resp.guestId);
      if (!guest) continue;
      guest.confirmed = resp.confirmed;
      guest.dietRestrictions = (resp.dietRestrictions || "").slice(0, 500);
      guest.confirmedAt = now;
      updated++;
    }
    if (!updated) return { success: false, error: "Nenhum convidado válido para este convite." };

    await this.saveInvite(invite);
    return { success: true, invite };
  }

  async getStoredConfig(): Promise<StoredConfig> {
    const data = (await this.kv.get("wedding_config", "json")) as Partial<StoredConfig> | null;
    return { ...DEFAULT_CONFIG, ...(data || {}) };
  }

  async getConfig(): Promise<EventConfig> {
    const { adminPassword: _ignored, ...config } = await this.getStoredConfig();
    return config;
  }

  async saveConfig(patch: Partial<EventConfig>): Promise<EventConfig> {
    const current = await this.getStoredConfig();
    const allowed = Object.fromEntries(
      Object.entries(patch).filter(([key]) => key in DEFAULT_CONFIG)
    ) as Partial<EventConfig>;
    await this.kv.put("wedding_config", JSON.stringify({ ...current, ...allowed }));
    return this.getConfig();
  }
}
