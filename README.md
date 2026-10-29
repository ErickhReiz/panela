# Chá de panela · Convites e confirmações

Aplicação de convites para chá de panela construída em TypeScript, Cloudflare Pages Functions e Cloudflare KV. O painel administrativo permite cadastrar convites por família ou por pessoa, personalizar o convite e acompanhar confirmações.

## Desenvolvimento

```bash
npm install
npm run dev
```

- Página inicial: `http://localhost:8788/`
- Painel: `http://localhost:8788/admin`
- Senha inicial do painel: `admin`

## Convites

No painel, escolha **Família** para reunir vários convidados em um link ou **Pessoa** para criar um link individual. Os links gerados ficam no formato `/familia/<slug>` e `/pessoa/<slug>`. Os caminhos antigos `/convite/<slug>` e `/c/<slug>` continuam aceitos.

A aba **Preview** acompanha os dados do convite. Em **Configurações**, altere nome, data, horário, local, endereço, cores, arredondamento e intensidade da sombra. A paleta inicial segue a referência em `image.png`: azul-marinho, marfim e detalhes botânicos.

Os convidados podem confirmar ou recusar presença e informar observações ou restrições alimentares. O painel gera links para copiar e compartilhar no WhatsApp e exporta a lista em CSV.

## Contatos

O painel tenta usar a API de contatos do navegador. Se ela não estiver disponível ou falhar, busca os nomes de `contatos.md` pela rota autenticada `/api/admin/contacts`. Coloque um convidado por linha, com ou sem marcador Markdown (`- Nome Sobrenome`). Também é possível importar manualmente um arquivo `.md` pela tela do convite.

## Cloudflare Pages e armazenamento

O app usa uma Pages Function para servir a página e a API. O binding `convited` acessa um namespace Workers KV configurado em `wrangler.toml`. O namespace precisa existir na conta Cloudflare usada no deploy. Também é possível configurar o binding KV em **Pages → Settings → Bindings** e redeployar.

Para publicar via GitHub, conecte este repositório como projeto Pages e use `npm run build` como comando de build e `public` como diretório de saída. Configure `ADMIN_PASSWORD` como variável de ambiente privada antes de publicar e associe o namespace KV `convited` ao projeto.

O plano Workers Free inclui Workers KV com cotas diárias limitadas. Consulte os limites atuais na [página de preços da Cloudflare](https://developers.cloudflare.com/workers/platform/pricing/).
