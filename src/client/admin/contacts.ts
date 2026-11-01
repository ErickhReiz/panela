export type Contact = { name: string; phone: string };

type ContactsManager = {
  select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
};

function contactsManager(): ContactsManager | undefined {
  return (navigator as Navigator & { contacts?: ContactsManager }).contacts;
}

/**
 * Contact Picker API (navigator.contacts.select).
 * Chrome/Edge/Samsung Internet no Android; Safari no iPhone só com o
 * sinalizador experimental "Contact Picker API" ativado. Exige HTTPS.
 */
export const hasContactPicker = () => window.isSecureContext && typeof contactsManager()?.select === "function";

export type Platform = "ios" | "android" | "other";

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // iPadOS se apresenta como Mac; diferencia pelo toque.
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/** No iOS, só o Safari respeita os sinalizadores de recursos do sistema. */
export const isIosSafari = () => detectPlatform() === "ios" && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);

export async function pickFromAgenda(): Promise<Contact[]> {
  const picked = await contactsManager()!.select(["name", "tel"], { multiple: true });
  return picked
    .filter(c => c.name?.[0]?.trim())
    .map(c => ({ name: c.name![0].trim(), phone: c.tel?.[0]?.trim() || "" }));
}

export const phoneKey = (phone?: string) => String(phone || "").replace(/\D/g, "");
