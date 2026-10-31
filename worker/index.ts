import { DB } from "./db";
import type { EventConfig, Invitation, RsvpResponse } from "../src/shared/types";
import { slugify } from "../src/shared/types";

export interface Env {
  cha_panela_kv: KVNamespace;
  ASSETS: Fetcher;
  ADMIN_PASSWORD?: string;
}

const SESSION_COOKIE = "admin_session";

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });

const fail = (error: string, status = 400) => json({ success: false, error }, status);

async function sessionToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`panela-admin:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return undefined;
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (!env.cha_panela_kv) {
    return fail("Binding KV 'cha_panela_kv' não encontrado no wrangler.toml.", 500);
  }

  const db = new DB(env.cha_panela_kv);
  const { pathname } = url;
  const method = request.method;
  const parts = pathname.split("/").filter(Boolean); // ["api", ...]

  // ---------- Público ----------
  if (pathname === "/api/config" && method === "GET") {
    return json(await db.getConfig());
  }

  if (parts[1] === "invites" && parts[2] && method === "GET") {
    const invite = await db.getInvite(decodeURIComponent(parts[2]));
    const mode = url.searchParams.get("mode");
    if (!invite || (mode && invite.mode && mode !== invite.mode)) {
      return fail("Convite não encontrado.", 404);
    }
    return json(invite);
  }

  if (pathname === "/api/rsvp" && method === "POST") {
    const body = await readJson<{ code?: string; responses?: RsvpResponse[] }>(request);
    if (!body?.code || !Array.isArray(body.responses)) return fail("Dados inválidos.");
    const result = await db.updateRSVP(body.code, body.responses);
    return result.success ? json({ success: true, invite: result.invite }) : fail(result.error!);
  }

  // ---------- Autenticação ----------
  const stored = await db.getStoredConfig();
  const adminPassword = env.ADMIN_PASSWORD || stored.adminPassword || "admin";
  const expectedToken = await sessionToken(adminPassword);
  const authenticated = readCookie(request, SESSION_COOKIE) === expectedToken;
  const secure = url.protocol === "https:" ? "; Secure" : "";

  if (pathname === "/api/admin/session" && method === "GET") {
    return json({ authenticated });
  }

  if (pathname === "/api/admin/login" && method === "POST") {
    const body = await readJson<{ password?: string }>(request);
    if (body?.password !== adminPassword) return fail("Senha incorreta! Tente novamente.", 401);
    return json({ success: true }, 200, {
      "Set-Cookie": `${SESSION_COOKIE}=${expectedToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${secure}`,
    });
  }

  if (pathname === "/api/admin/logout" && method === "POST") {
    return json({ success: true }, 200, {
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
    });
  }

  // ---------- Admin (protegido) ----------
  if (parts[1] === "admin") {
    if (!authenticated) return fail("Não autorizado.", 401);

    if (pathname === "/api/admin/invites" && method === "GET") {
      return json(await db.getAllInvites());
    }

    if (pathname === "/api/admin/invites" && method === "POST") {
      const body = await readJson<Partial<Invitation>>(request);
      if (!body?.title || !Array.isArray(body.guests)) {
        return fail("Título e lista de convidados são obrigatórios.");
      }
      const code = slugify(body.code || body.title);
      if (!code) return fail("Código inválido.");
      if (await db.getInvite(code)) return fail(`Já existe um convite com o código "${code}".`);

      const now = new Date().toISOString();
      const invite: Invitation = {
        code,
        title: body.title,
        mode: body.mode === "pessoa" ? "pessoa" : "familia",
        guests: body.guests,
        createdAt: now,
        updatedAt: now,
      };
      return json({ success: true, invite: await db.saveInvite(invite) });
    }

    if (parts[2] === "invites" && parts[3]) {
      const code = decodeURIComponent(parts[3]).toLowerCase().trim();

      if (method === "PUT") {
        const body = await readJson<Partial<Invitation>>(request);
        const existing = await db.getInvite(code);
        if (!existing) return fail("Convite não encontrado.", 404);
        existing.title = body?.title || existing.title;
        if (body?.mode === "pessoa" || body?.mode === "familia") existing.mode = body.mode;
        existing.mode ||= "familia";
        if (Array.isArray(body?.guests)) existing.guests = body.guests;
        return json({ success: true, invite: await db.saveInvite(existing) });
      }

      if (method === "DELETE") {
        await db.deleteInvite(code);
        return json({ success: true });
      }
    }

    if (pathname === "/api/admin/export" && method === "GET") {
      const invites = await db.getAllInvites();
      const cell = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const lines = ["Grupo/Convite;Nome Convidado;Telefone;Status Confirmação;Observação;Data Resposta"];
      for (const inv of invites) {
        for (const g of inv.guests) {
          const status = g.confirmed === true ? "Confirmado" : g.confirmed === false ? "Não irá" : "Pendente";
          const date = g.confirmedAt ? new Date(g.confirmedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
          lines.push([inv.title, g.name, g.phone || "", status, g.dietRestrictions || "", date].map(cell).join(";"));
        }
      }
      return new Response("﻿" + lines.join("\n") + "\n", {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="convidados_cha_de_panela.csv"`,
        },
      });
    }

    if (pathname === "/api/admin/settings" && method === "POST") {
      const body = await readJson<Partial<EventConfig>>(request);
      if (!body) return fail("Dados inválidos.");
      return json({ success: true, config: await db.saveConfig(body) });
    }
  }

  return fail("Rota não encontrada.", 404);
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        console.error(err);
        return fail("Erro interno.", 500);
      }
    }
    // Todo o resto é o app React (SPA) servido pelos Static Assets.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
