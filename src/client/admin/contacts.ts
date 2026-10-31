export type Contact = { name: string; phone: string };

type ContactsManager = {
  select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>;
};

function contactsManager(): ContactsManager | undefined {
  return (navigator as Navigator & { contacts?: ContactsManager }).contacts;
}

/** Contact Picker API: Chrome/Edge/Samsung Internet no Android (e Safari iOS com flag experimental). */
export const hasContactPicker = () => typeof contactsManager()?.select === "function";

export async function pickFromAgenda(): Promise<Contact[]> {
  const picked = await contactsManager()!.select(["name", "tel"], { multiple: true });
  return picked
    .filter(c => c.name?.[0]?.trim())
    .map(c => ({ name: c.name![0].trim(), phone: c.tel?.[0]?.trim() || "" }));
}

export const phoneKey = (phone?: string) => String(phone || "").replace(/\D/g, "");

function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = [];
  const raw = value.replace(/=\r?\n/g, "");
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "=" && /^[0-9A-F]{2}$/i.test(raw.slice(i + 1, i + 3))) {
      bytes.push(parseInt(raw.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...new TextEncoder().encode(raw[i]));
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function unescapeVcard(value: string) {
  return value.replace(/\\([,;\\])/g, "$1").replace(/\\n/gi, " ").trim();
}

/** Lê arquivos .vcf (vCard 2.1/3.0/4.0), exportados pela agenda do iPhone, Android ou Google. */
function parseVcard(text: string): Contact[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const contacts: Contact[] = [];
  let current: { fn?: string; n?: string; tel?: string } | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith("BEGIN:VCARD")) current = {};
    else if (upper.startsWith("END:VCARD")) {
      const name = current?.fn || current?.n;
      if (name) contacts.push({ name, phone: current?.tel || "" });
      current = null;
    } else if (current) {
      const sep = line.indexOf(":");
      if (sep < 0) continue;
      const head = line.slice(0, sep).toUpperCase();
      let value = line.slice(sep + 1);
      if (head.includes("QUOTED-PRINTABLE")) value = decodeQuotedPrintable(value);
      const prop = head.split(";")[0].split(".").pop();
      if (prop === "FN") current.fn = unescapeVcard(value);
      else if (prop === "N" && !current.n) {
        const [last = "", first = "", middle = ""] = value.split(";").map(unescapeVcard);
        current.n = [first, middle, last].filter(Boolean).join(" ");
      } else if (prop === "TEL" && !current.tel) current.tel = value.replace(/^tel:/i, "").trim();
    }
  }
  return contacts;
}

/**
 * Lê uma lista colada: um contato por linha, ex.
 *   Maria Souza, (48) 99999-1234
 *   João Silva; +55 48 98888-0000
 *   Ana Lima
 */
function parseLines(text: string): Contact[] {
  const contacts: Contact[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^"|"$/g, "");
    if (!line) continue;
    const match = line.match(/(\+?[\d\s().-]{8,})\s*$/);
    let name = line;
    let phone = "";
    if (match && phoneKey(match[1]).length >= 8) {
      phone = match[1].trim();
      name = line.slice(0, match.index).trim();
    }
    name = name.replace(/["]/g, "").replace(/[\s,;:\t-]+$/, "").trim();
    // Ignora linha de cabeçalho como "Nome, Telefone".
    if (!name || (!phone && /^(nome|name)\b/i.test(name))) continue;
    contacts.push({ name, phone });
  }
  return contacts;
}

export function parseContacts(text: string): Contact[] {
  return /BEGIN:VCARD/i.test(text) ? parseVcard(text) : parseLines(text);
}
