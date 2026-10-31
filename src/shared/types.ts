export type InviteMode = "familia" | "pessoa";

export interface Guest {
  id: string;
  name: string;
  phone?: string;
  /** true: confirmado, false: recusou, null: pendente */
  confirmed: boolean | null;
  dietRestrictions?: string;
  confirmedAt?: string | null;
}

export interface Invitation {
  /** Slug único usado na URL */
  code: string;
  /** Nome da família ou da pessoa */
  title: string;
  mode?: InviteMode;
  guests: Guest[];
  createdAt: string;
  updatedAt: string;
}

export interface EventConfig {
  coupleNames: string;
  /** Ex.: "2027-02-13T11:30" */
  eventDate: string;
  eventTime: string;
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
  sendMode: InviteMode;
}

export interface RsvpResponse {
  guestId: string;
  confirmed: boolean | null;
  dietRestrictions?: string;
}

export const DEFAULT_CONFIG: EventConfig = {
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
  sendMode: "familia",
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function invitePath(mode: InviteMode | undefined, code: string): string {
  return mode === "pessoa" ? `/${code}` : `/familia/${code}`;
}
