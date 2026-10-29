# Chá de panela · Convites e confirmações

Aplicação de convites para chá de panela construída em TypeScript, Cloudflare Pages Functions e Cloudflare KV. O painel administrativo permite cadastrar convites por família ou por pessoa, personalizar o convite e acompanhar confirmações.

## Desenvolvimento

```bash
npm install
npm run dev
```

- Página inicial: `http://localhost:8788/`
- Painel: `http://localhost:8788/admin`

## Convites

No painel, escolha **Família** para reunir vários convidados em um link ou **Pessoa** para criar um link individual. Os links de pessoa usam `/<slug>` e os de família usam `/familia/<slug>`. Os caminhos antigos `/pessoa/<slug>`, `/convite/<slug>` e `/c/<slug>` continuam aceitos.

A aba **Preview** acompanha os dados do convite. Em **Configurações**, altere nome, data, horário, local, endereço, cores, arredondamento e intensidade da sombra. A paleta inicial segue a referência em `image.png`: azul-marinho, marfim e detalhes botânicos.

Os convidados podem confirmar ou recusar presença e informar observações ou restrições alimentares. O painel gera links para copiar e compartilhar no WhatsApp e exporta a lista em CSV.

## Contatos

A importação múltipla usa a agenda do aparelho quando o navegador oferece essa função. No modo **Família**, os contatos selecionados entram como convidados do mesmo link; no modo **Pessoa**, cada contato gera um convite individual e números já cadastrados são ignorados.

## Cloudflare Pages e armazenamento

O app usa uma Pages Function para servir a página e a API. O binding `cha_panela_kv` acessa um namespace Workers KV configurado em `wrangler.toml`. O namespace precisa existir na conta Cloudflare usada no deploy. Também é possível configurar o binding KV em **Pages → Settings → Bindings** e redeployar.

Para publicar via GitHub, conecte este repositório como projeto Pages e use `npm run build` como comando de build e `public` como diretório de saída. Associe o namespace KV `cha_panela_kv` ao projeto Pages.

O plano Workers Free inclui Workers KV com cotas diárias limitadas. Consulte os limites atuais na [página de preços da Cloudflare](https://developers.cloudflare.com/workers/platform/pricing/).
