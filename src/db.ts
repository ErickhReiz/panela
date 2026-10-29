export interface Guest {
  id: string;
  name: string;
  confirmed: boolean | null; // true: confirmed, false: declined, null: pending
  dietRestrictions?: string;
  confirmedAt?: string | null;
}

export interface Invitation {
  code: string; // Unique URL slug/code
  title: string; // Group / Family name (e.g., "Família Silva", "Gabriel & Luana")
  mode?: "familia" | "pessoa";
  customMessage?: string;
  guests: Guest[];
  createdAt: string;
  updatedAt: string;
}

export interface WeddingConfig {
  coupleNames: string;
  eventDate: string; // ISO date string or "2026-12-19T17:00"
  eventTime: string; // e.g. "17:00"
  venueName: string;
  venueAddress: string;
  googleMapsUrl: string;
  giftRegistryUrl: string;
  welcomeMessage: string;
  primaryColor: string;
  secondaryColor: string;
  cardColor: string;
  pageColor: string;
  cornerRadius: number;
  shadowStrength: number;
  adminPassword?: string;
}

const DEFAULT_CONFIG: WeddingConfig = {
  coupleNames: "Fabiana e Davi",
  eventDate: "2027-02-13T11:30",
  eventTime: "11:30",
  venueName: "Nossa casa",
  venueAddress: "Rua Atílio Pedro Pagani, 1350 — Pagani, Palhoça",
  googleMapsUrl: "https://maps.google.com",
  giftRegistryUrl: "#",
  welcomeMessage: "Nossa casa está em construção e será ainda mais especial com a sua presença!",
  primaryColor: "#142b4a",
  secondaryColor: "#66809d",
  cardColor: "#fffdf8",
  pageColor: "#f6f2e9",
  cornerRadius: 18,
  shadowStrength: 24,
  adminPassword: "admin"
};

export class DB {
  private kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  // Get index list of invitation codes
  async getInviteIndex(): Promise<string[]> {
    const data = await this.kv.get("invites_index", "json");
    return (data as string[]) || [];
  }

  private async saveInviteIndex(index: string[]): Promise<void> {
    await this.kv.put("invites_index", JSON.stringify(index));
  }

  // Get a single invitation by code
  async getInvite(code: string): Promise<Invitation | null> {
    const cleanCode = code.toLowerCase().trim();
    const data = await this.kv.get(`invite:${cleanCode}`, "json");
    return data as Invitation | null;
  }

  // Get all invitations
  async getAllInvites(): Promise<Invitation[]> {
    const index = await this.getInviteIndex();
    const invites: Invitation[] = [];
    
    // Fetch in parallel for high efficiency
    const promises = index.map(code => this.getInvite(code));
    const results = await Promise.all(promises);

    for (const inv of results) {
      if (inv) invites.push(inv);
    }
    return invites;
  }

  // Create or Update Invitation
  async saveInvite(invite: Invitation): Promise<Invitation> {
    const cleanCode = invite.code.toLowerCase().trim();
    invite.code = cleanCode;
    invite.updatedAt = new Date().toISOString();
    if (!invite.createdAt) {
      invite.createdAt = invite.updatedAt;
    }

    await this.kv.put(`invite:${cleanCode}`, JSON.stringify(invite));

    // Update index if code not present
    const index = await this.getInviteIndex();
    if (!index.includes(cleanCode)) {
      index.push(cleanCode);
      await this.saveInviteIndex(index);
    }

    return invite;
  }

  // Delete Invitation
  async deleteInvite(code: string): Promise<boolean> {
    const cleanCode = code.toLowerCase().trim();
    await this.kv.delete(`invite:${cleanCode}`);

    const index = await this.getInviteIndex();
    const updatedIndex = index.filter(c => c !== cleanCode);
    await this.saveInviteIndex(updatedIndex);

    return true;
  }

  // Public RSVP update
  async updateRSVP(
    code: string,
    responses: Array<{ guestId: string; confirmed: boolean | null; dietRestrictions?: string }>
  ): Promise<{ success: boolean; invite?: Invitation; error?: string }> {
    const invite = await this.getInvite(code);
    if (!invite) {
      return { success: false, error: "Convite não encontrado." };
    }

    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const resp of responses) {
      const guest = invite.guests.find(g => g.id === resp.guestId);
      if (guest) {
        guest.confirmed = resp.confirmed;
        guest.dietRestrictions = resp.dietRestrictions || "";
        guest.confirmedAt = now;
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      return { success: false, error: "Nenhum convidado válido para este convite." };
    }

    await this.saveInvite(invite);
    return { success: true, invite };
  }

  // Get Wedding Config
  async getConfig(defaultAdminPass: string = "admin"): Promise<WeddingConfig> {
    const data = await this.kv.get("wedding_config", "json");
    if (!data) {
      const cfg = { ...DEFAULT_CONFIG, adminPassword: defaultAdminPass };
      return cfg;
    }
    return { ...DEFAULT_CONFIG, ...(data as Partial<WeddingConfig>) };
  }

  // Save Wedding Config
  async saveConfig(config: Partial<WeddingConfig>): Promise<WeddingConfig> {
    const current = await this.getConfig();
    const updated = { ...current, ...config };
    await this.kv.put("wedding_config", JSON.stringify(updated));
    return updated;
  }
}
