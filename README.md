# Chá de panela · Convites e confirmações

App de convites para chá de panela: front-end em **React + Vite** e API em um **Cloudflare Worker** com **Workers KV**. O painel administrativo permite cadastrar convites por família ou por pessoa, personalizar o convite e acompanhar confirmações.

Produção: https://panela.erickhreiz.workers.dev

## Estrutura

```
src/client/        App React (páginas públicas e painel /admin)
src/shared/        Tipos e utilitários usados pelo app e pelo Worker
worker/            Worker: API em /api/* (KV, login, CSV)
public/            Arquivos estáticos copiados para o build
wrangler.toml      Worker "panela" + Static Assets (dist/) + binding KV
```

O Worker só roda em `/api/*`; todas as outras rotas servem o app React (`not_found_handling = "single-page-application"`).

## Desenvolvimento

```bash
npm install
npm run dev        # build do React + wrangler dev em http://localhost:8787
npm run dev:ui     # (opcional) Vite com hot reload; requer `wrangler dev` rodando na 8787
npm run typecheck
```

- Página inicial: `/`
- Painel: `/admin`

## Deploy

```bash
npm run deploy     # vite build + wrangler deploy
```

Na integração Git do Cloudflare (Workers Builds), use `npm run build` como comando de build e `npx wrangler deploy` como comando de deploy.

A senha do painel vem de `ADMIN_PASSWORD`. Recomenda-se removê-la do `wrangler.toml` e configurá-la como secret:

```bash
npx wrangler secret put ADMIN_PASSWORD
```

## Convites

No painel, escolha **Família** para reunir vários convidados em um link ou **Pessoa** para criar um link individual. Os links de pessoa usam `/<slug>` e os de família usam `/familia/<slug>`. Os caminhos antigos `/pessoa/<slug>`, `/convite/<slug>` e `/c/<slug>` continuam aceitos.

A aba **Preview** mostra o cartão do convite. Em **Configurações**, altere nome, data, horário, local, endereço, cores, arredondamento e sombra. A paleta inicial segue a referência em `image.png`: azul-marinho, marfim e detalhes botânicos.

Os convidados confirmam ou recusam presença e informam observações ou restrições alimentares. O painel gera links para copiar e compartilhar no WhatsApp e exporta a lista em CSV.

## Contatos

A importação múltipla usa a agenda do aparelho quando o navegador oferece essa função (Contact Picker API). No modo **Família**, os contatos selecionados entram como convidados do mesmo link; no modo **Pessoa**, cada contato gera um convite individual e números já cadastrados são ignorados.
