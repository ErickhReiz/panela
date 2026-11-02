import { useCallback, useEffect, useMemo, useState } from "react";
import type { GiftItem, GiftList as GiftListData } from "../../shared/types";
import { api } from "../api";

const REFRESH_MS = 2 * 60_000;

type Filter = "todos" | "ate100" | "ate200" | "200a500" | "acima500";
const FILTERS: { id: Filter; label: string; test: (p: number) => boolean }[] = [
  { id: "todos", label: "Todos", test: () => true },
  { id: "ate100", label: "Até R$ 100", test: p => p <= 100 },
  { id: "ate200", label: "R$ 100 a 200", test: p => p > 100 && p <= 200 },
  { id: "200a500", label: "R$ 200 a 500", test: p => p > 200 && p <= 500 },
  { id: "acima500", label: "Acima de R$ 500", test: p => p > 500 },
];

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function GiftCard({ item, buyUrl }: { item: GiftItem; buyUrl: string }) {
  return (
    <article className="gift-card">
      <div className="gift-img-wrap">
        <img
          className="gift-img"
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          width={160}
          height={160}
        />
        {item.remaining > 1 && <span className="gift-badge">Faltam {item.remaining}</span>}
      </div>
      <div className="gift-body">
        <h3 className="gift-name">{item.name}</h3>
        {item.variation && <div className="gift-variation">{item.variation}</div>}
        <div className="gift-price">{item.price ? brl(item.price) : `R$ ${item.priceLabel}`}</div>
        {item.installments && <div className="gift-installments">{item.installments}</div>}
        <a className="gift-buy" href={buyUrl} target="_blank" rel="noopener">
          🎁 Presentear
        </a>
      </div>
    </article>
  );
}

/** Cards da lista de presentes da Havan, atualizados automaticamente. */
export function GiftList({ fallbackUrl }: { fallbackUrl: string }) {
  const [data, setData] = useState<GiftListData | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("todos");

  const load = useCallback(() => {
    api
      .gifts()
      .then(list => {
        setData(list);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const visible = useMemo(() => {
    const test = FILTERS.find(f => f.id === filter)!.test;
    return (data?.items || []).filter(i => test(i.price));
  }, [data, filter]);

  const usedFilters = useMemo(
    () => FILTERS.filter(f => f.id === "todos" || data?.items.some(i => f.test(i.price))),
    [data]
  );

  const buyUrl = data?.buyUrl || fallbackUrl;

  return (
    <section className="section-card">
      <h2 className="section-title">Lista de presentes</h2>
      <p className="section-sub">
        Escolha um presente e toque em <strong>Presentear</strong> para finalizar na Havan.
      </p>

      {!data && !error && <div className="gift-status">Carregando presentes…</div>}

      {!data && error && (
        <div className="gift-status">
          Não conseguimos carregar a lista agora.
          <br />
          <a href={fallbackUrl} target="_blank" rel="noopener" className="action-link">
            🛍️ Ver lista na Havan
          </a>
        </div>
      )}

      {data && (
        <>
          {usedFilters.length > 2 && (
            <div className="gift-filters" role="tablist">
              {usedFilters.map(f => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === f.id}
                  className={`gift-filter ${filter === f.id ? "active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {data.items.length === 0 ? (
            <div className="gift-status">Todos os presentes já foram escolhidos. Obrigado! 💛</div>
          ) : (
            <div className="gift-grid">
              {visible.map(item => (
                <GiftCard key={item.id} item={item} buyUrl={buyUrl} />
              ))}
            </div>
          )}

          <p className="gift-footnote">
            {data.items.length} {data.items.length === 1 ? "item disponível" : "itens disponíveis"} ·{" "}
            <a href={buyUrl} target="_blank" rel="noopener">
              ver lista completa na Havan
            </a>
          </p>
        </>
      )}
    </section>
  );
}
