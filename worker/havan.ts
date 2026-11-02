import type { GiftItem, GiftList } from "../src/shared/types";
import { havanListUrl } from "../src/shared/types";

/**
 * Lê a lista de presentes pública da Havan.
 *
 * A Havan não tem API pública: a página do convidado carrega os cards via AJAX
 * em dois endpoints internos (sem login). Lemos o mesmo HTML e extraímos os
 * dados com HTMLRewriter. Se a Havan mudar o markup, ajuste os seletores aqui.
 */

const BASE = "https://lista.havan.com.br";
const MAX_PAGES = 10;
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9",
  "X-Requested-With": "XMLHttpRequest",
};

const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const clean = (value: string | null | undefined) => decodeEntities(value || "").replace(/\s+/g, " ").trim();

/** "1.299,99" → 1299.99 */
function parsePrice(value: string): number {
  const n = parseFloat(value.replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

interface Draft {
  idProduto?: string;
  idVariacao?: string;
  name?: string;
  price?: string;
  image?: string;
  installments: string;
  quantities: number[];
  quantityLabel: string;
  variation?: string;
  virtual?: boolean;
}

/** Extrai os cards (`div.itens-loading`) de um trecho de HTML da Havan. */
export async function parseCards(html: string): Promise<{ items: GiftItem[]; total: number | null }> {
  const drafts: Draft[] = [];
  let total: number | null = null;
  const current = () => drafts[drafts.length - 1];

  const rewriter = new HTMLRewriter()
    .on("input#TotalItemCount", {
      element(el) {
        const n = parseInt(el.getAttribute("value") || "", 10);
        if (Number.isFinite(n)) total = n;
      },
    })
    .on("div.itens-loading", {
      element() {
        drafts.push({ installments: "", quantities: [], quantityLabel: "" });
      },
    })
    .on("div.itens-loading input[type=hidden]", {
      element(el) {
        const d = current();
        if (!d) return;
        const value = el.getAttribute("value") || "";
        switch (el.getAttribute("name")) {
          case "IdProduto": d.idProduto = value; break;
          case "IdVariacao": d.idVariacao = value; break;
          case "NomeProduto": d.name = value; break;
          case "PrecoVenda": d.price = value; break;
        }
      },
    })
    .on("div.itens-loading img.img-lista-presente", {
      element(el) {
        const d = current();
        if (d && !d.image) d.image = el.getAttribute("src") || undefined;
      },
    })
    .on("div.itens-loading .valor-parcelas", {
      text(chunk) {
        const d = current();
        if (d) d.installments += chunk.text;
      },
    })
    .on("div.itens-loading select[name=quantidade] option", {
      element(el) {
        const n = parseInt(el.getAttribute("value") || "", 10);
        if (Number.isFinite(n)) current()?.quantities.push(n);
      },
    })
    // Quando falta só uma unidade a Havan mostra um <label>1</label> no lugar do <select>.
    .on("div.itens-loading div.select-container > label.select-container__label:not([for])", {
      text(chunk) {
        const d = current();
        if (d) d.quantityLabel += chunk.text;
      },
    })
    .on("div.itens-loading button[name=comprarItem]", {
      element(el) {
        const d = current();
        if (!d) return;
        d.variation = el.getAttribute("data-nomevariacao") || undefined;
        d.virtual = (el.getAttribute("data-itemvirtual") || "").toLowerCase() === "sim";
        d.name ||= el.getAttribute("data-nome") || undefined;
        d.price ||= el.getAttribute("data-valor") || undefined;
      },
    });

  await rewriter.transform(new Response(html)).arrayBuffer();

  const items: GiftItem[] = [];
  for (const d of drafts) {
    if (!d.idProduto || !d.name) continue;
    const priceLabel = clean(d.price);
    const labelQty = parseInt(d.quantityLabel.trim(), 10);
    const remaining = d.quantities.length ? Math.max(...d.quantities) : Number.isFinite(labelQty) ? labelQty : 1;
    const image = clean(d.image);
    items.push({
      id: `${d.idProduto}-${d.idVariacao || "0"}`,
      name: clean(d.name),
      variation: clean(d.variation) || undefined,
      price: parsePrice(priceLabel),
      priceLabel,
      installments: clean(d.installments) || undefined,
      imageUrl: image ? new URL(image, BASE).toString() : `${BASE}/Content/Images/foto-nula.webp`,
      remaining,
      virtual: !!d.virtual,
    });
  }
  return { items, total };
}

async function havanFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { ...HEADERS, Referer: `${BASE}/`, ...(init.headers || {}) },
    redirect: "manual",
  });
  if (!res.ok) throw new Error(`Havan respondeu ${res.status} em ${path}`);
  return res;
}

/** Busca todos os itens da lista (primeira página + "carregar mais"). */
export async function fetchHavanList(listId: string): Promise<GiftList> {
  const first = await havanFetch(`/Convidado/CarregarPresentesPartial?idLista=${encodeURIComponent(listId)}`);
  const { items, total } = await parseCards(await first.text());
  if (!items.length && !total) throw new Error("Nenhum item encontrado na lista da Havan.");

  const seen = new Set(items.map(i => i.id));
  for (let page = 2; page <= MAX_PAGES && (total === null || items.length < total); page++) {
    const body = new URLSearchParams({
      IdListaPresente: listId,
      ocultar: "false",
      Page: String(page),
      TotalCount: String(total ?? ""),
      IdFamiliaProduto: "0",
    });
    const res = await havanFetch("/Convidado/GridItensListaPresenteLazyLoad", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    });
    const data = (await res.json()) as { carregarMais?: boolean; view?: string };
    const parsed = await parseCards(data.view || "");
    const fresh = parsed.items.filter(i => !seen.has(i.id));
    fresh.forEach(i => seen.add(i.id));
    items.push(...fresh);
    if (!data.carregarMais || !fresh.length) break;
  }

  return {
    listId,
    total: items.length,
    items,
    buyUrl: havanListUrl(listId),
    fetchedAt: new Date().toISOString(),
  };
}
