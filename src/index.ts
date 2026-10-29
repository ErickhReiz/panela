import { DB, Invitation } from "./db";
import { renderHomeHtml } from "./templates/home";
import { renderInviteHtml } from "./templates/invite";
import { renderAdminLoginHtml, renderAdminDashboardHtml } from "./templates/admin";

export interface Env {
  convited?: KVNamespace;
  CONVITES?: KVNamespace;
  ADMIN_PASSWORD?: string;
  ASSETS?: { fetch: (request: Request | string | URL) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Get KV binding (support both 'convited' as in wrangler.toml and 'CONVITES')
    const kv = env.convited || env.CONVITES;
    if (!kv) {
      return new Response("KV Namespace binding não encontrado no wrangler.toml.", { status: 500 });
    }

    const db = new DB(kv);
    const defaultAdminPass = env.ADMIN_PASSWORD || "admin";
    const config = await db.getConfig(defaultAdminPass);

    // --- Helper Functions ---
    const getSessionToken = () => {
      const cookieHeader = request.headers.get("Cookie") || "";
      const cookies = Object.fromEntries(
        cookieHeader.split(";").map(c => {
          const [k, ...v] = c.trim().split("=");
          return [k, v.join("=")];
        })
      );
      return cookies["admin_session"];
    };

    const isAuthenticated = () => {
      const token = getSessionToken();
      if (!token) return false;
      const expectedToken = btoa(`admin:${config.adminPassword || defaultAdminPass}`);
      return token === expectedToken;
    };

    const json = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      });
    };

    const html = (htmlContent: string, status = 200) => {
      return new Response(htmlContent, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    };

    // --- ROUTER ---

    // 1. PUBLIC LANDING PAGE
    if (pathname === "/") {
      return html(renderHomeHtml(config));
    }

    // 2. PUBLIC INVITATION PAGE: /convite/:code or /c/:code
    if (pathname.startsWith("/convite/") || pathname.startsWith("/c/") || pathname.startsWith("/familia/") || pathname.startsWith("/pessoa/")) {
      const routeMode = pathname.startsWith("/familia/") ? "familia" : pathname.startsWith("/pessoa/") ? "pessoa" : undefined;
      const code = pathname.split("/")[2]?.toLowerCase().trim();
      if (!code) {
        return Response.redirect(`${url.origin}/`, 302);
      }

      const invite = await db.getInvite(code);
      if (!invite || (routeMode && invite.mode && routeMode !== invite.mode)) {
        return html(`
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <title>Convite não encontrado</title>
            <style>
              body { font-family: sans-serif; background: #0f1219; color: #fff; text-align: center; padding: 60px 20px; }
              h1 { color: #d4af37; margin-bottom: 12px; }
              a { color: #f3e5ab; }
            </style>
          </head>
          <body>
            <h1>Convite não encontrado 😔</h1>
            <p>O código "<strong>${code}</strong>" não foi localizado em nossa lista.</p>
            <p style="margin-top: 20px;"><a href="/">Voltar para a página inicial</a></p>
          </body>
          </html>
        `, 404);
      }

      return html(renderInviteHtml(invite, config, url.origin));
    }

    // 3. PUBLIC RSVP API: POST /api/rsvp
    if (pathname === "/api/rsvp" && request.method === "POST") {
      try {
        const body: { code: string; responses: Array<{ guestId: string; confirmed: boolean | null; dietRestrictions?: string }> } = await request.json();
        if (!body || !body.code || !Array.isArray(body.responses)) {
          return json({ success: false, error: "Dados inválidos." }, 400);
        }

        const result = await db.updateRSVP(body.code, body.responses);
        if (!result.success) {
          return json({ success: false, error: result.error }, 400);
        }

        return json({ success: true, invite: result.invite });
      } catch (err: any) {
        return json({ success: false, error: "Erro ao processar RSVP." }, 500);
      }
    }

    // 4. ADMIN LOGIN PAGE & ACTION
    if (pathname === "/admin") {
      if (isAuthenticated()) {
        return html(renderAdminDashboardHtml(config, url.origin));
      }
      return html(renderAdminLoginHtml());
    }

    if (pathname === "/api/admin/login" && request.method === "POST") {
      let password = "";
      const contentType = request.headers.get("Content-Type") || "";
      if (contentType.includes("form")) {
        const formData = await request.formData();
        password = (formData.get("password") as string) || "";
      } else {
        const body: any = await request.json();
        password = body.password || "";
      }

      const activePassword = config.adminPassword || defaultAdminPass;
      if (password === activePassword) {
        const token = btoa(`admin:${activePassword}`);
        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/admin",
            "Set-Cookie": `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
          }
        });
      } else {
        return html(renderAdminLoginHtml("Senha incorreta! Tente novamente."), 401);
      }
    }

    if (pathname === "/api/admin/logout") {
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/admin",
          "Set-Cookie": "admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
        }
      });
    }

    // --- PROTECTED ADMIN API ENDPOINTS ---
    if (pathname.startsWith("/api/admin/")) {
      if (!isAuthenticated()) {
        return json({ success: false, error: "Não autorizado." }, 401);
      }

      // CONTACTS FALLBACK: names from the workspace Markdown file.
      if (pathname === "/api/admin/contacts" && request.method === "GET") {
        const asset = env.ASSETS
          ? await env.ASSETS.fetch(new URL("/contatos.md", url.origin))
          : new Response("", { status: 404 });
        const markdown = asset.ok ? await asset.text() : "";
        const contacts = markdown.split(/\r?\n/).map(line => line.trim())
          .filter(line => line && !line.startsWith("#"))
          .map(line => line.replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, "").trim())
          .filter(line => line && !/^nome(s)?$/i.test(line));
        return json(contacts);
      }

      // GET ALL INVITES: GET /api/admin/invites
      if (pathname === "/api/admin/invites" && request.method === "GET") {
        const invites = await db.getAllInvites();
        return json(invites);
      }

      // CREATE INVITE: POST /api/admin/invites
      if (pathname === "/api/admin/invites" && request.method === "POST") {
        const body: Partial<Invitation> = await request.json();
        if (!body.title || !body.guests || !Array.isArray(body.guests)) {
          return json({ success: false, error: "Título e lista de convidados são obrigatórios." }, 400);
        }

        let code = body.code ? body.code.toLowerCase().trim() : "";
        if (!code) {
          code = body.title
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-");
        }

        const existing = await db.getInvite(code);
        if (existing) {
          return json({ success: false, error: `Já existe um convite com o código "${code}".` }, 400);
        }

        const newInvite: Invitation = {
          code,
          title: body.title,
          mode: body.mode === "pessoa" ? "pessoa" : "familia",
          customMessage: body.customMessage || "",
          guests: body.guests,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.saveInvite(newInvite);
        return json({ success: true, invite: newInvite });
      }

      // UPDATE INVITE: PUT /api/admin/invites/:code
      if (pathname.startsWith("/api/admin/invites/") && request.method === "PUT") {
        const code = pathname.split("/")[4]?.toLowerCase().trim();
        if (!code) return json({ success: false, error: "Código inválido." }, 400);

        const body: Partial<Invitation> = await request.json();
        const existing = await db.getInvite(code);
        if (!existing) {
          return json({ success: false, error: "Convite não encontrado." }, 404);
        }

        existing.title = body.title || existing.title;
        existing.mode = body.mode === "pessoa" ? "pessoa" : body.mode === "familia" ? "familia" : existing.mode || "familia";
        existing.customMessage = body.customMessage !== undefined ? body.customMessage : existing.customMessage;
        if (body.guests && Array.isArray(body.guests)) {
          existing.guests = body.guests;
        }

        await db.saveInvite(existing);
        return json({ success: true, invite: existing });
      }

      // DELETE INVITE: DELETE /api/admin/invites/:code
      if (pathname.startsWith("/api/admin/invites/") && request.method === "DELETE") {
        const code = pathname.split("/")[4]?.toLowerCase().trim();
        if (!code) return json({ success: false, error: "Código inválido." }, 400);

        await db.deleteInvite(code);
        return json({ success: true });
      }

      // EXPORT CSV: GET /api/admin/export
      if (pathname === "/api/admin/export" && request.method === "GET") {
        const invites = await db.getAllInvites();
        let csv = "Grupo/Convite;Nome Convidado;Status Confirmação;Observação;Data Resposta\n";

        invites.forEach(inv => {
          inv.guests.forEach(g => {
            const statusStr = g.confirmed === true ? "Confirmado" : g.confirmed === false ? "Não irá" : "Pendente";
            const dateStr = g.confirmedAt ? new Date(g.confirmedAt).toLocaleString("pt-BR") : "";
            const dietStr = (g.dietRestrictions || "").replace(/;/g, ",");
            csv += `"${inv.title}";"${g.name}";"${statusStr}";"${dietStr}";"${dateStr}"\n`;
          });
        });

        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="convidados_cha_de_panela.csv"`
          }
        });
      }

      // UPDATE SETTINGS: POST /api/admin/settings
      if (pathname === "/api/admin/settings" && request.method === "POST") {
        const body = await request.json();
        const updatedConfig = await db.saveConfig(body);
        return json({ success: true, config: updatedConfig });
      }
    }

    return new Response("Página não encontrada (404)", { status: 404 });
  }
};
