# Faz & Resolve — Backend API

## Sobre a API

A API REST do Faz & Resolve atende o frontend e concentra autenticação, regras de negócio e persistência dos módulos de gestão. Ela é executada em Node.js, expõe recursos sob o prefixo `/api` e usa MongoDB como banco de dados.

## Tecnologias

- Node.js e Express.
- MongoDB e Mongoose.
- JWT, `express-session`, CORS e `express-validator`.
- PDFKit e pdfmake para geração de documentos e relatórios.
- Integrações opcionais com Mercado Pago, Google, WhatsApp, SendGrid, Cloudinary e Focus NFe.

## Estrutura

```text
Backend/
├── server.js             # inicialização do Express e registro de rotas
├── src/
│   ├── config/           # conexão e configurações
│   ├── controllers/      # tratamento das requisições
│   ├── jobs/             # tarefas agendadas/opcionais
│   ├── middlewares/      # autenticação, permissões e tratamento de erros
│   ├── models/           # schemas Mongoose
│   ├── routes/           # rotas da API
│   └── services/         # regras e integrações de domínio
├── scripts/seed-demo.js  # carga de dados de demonstração
└── public/               # arquivos estáticos e uploads
```

## Principais módulos

- Autenticação, usuários, membros e permissões.
- Clientes, portal do cliente, pedidos/orçamentos e agenda.
- Financeiro, despesas, pagamentos, assinaturas e notas fiscais.
- Produtos, estoque, fornecedores, catálogo e modelos de serviço.
- Dashboard, relatórios, notificações e templates/conversas de WhatsApp.

As rotas dos módulos internos usam middlewares de autenticação e, quando aplicável, verificações de permissão e plano.

## Variáveis de ambiente

Crie `.env` com base em `.env.example`:

```powershell
Copy-Item .env.example .env
```

Variáveis mínimas para a execução local:

```text
PORT
MONGODB_URI
JWT_SECRET
SESSION_SECRET
CRYPTO_SECRET_KEY
CRYPTO_IV
FRONTEND_URL
ENABLE_JOBS
SEED_DEMO_DATA
```

`ENABLE_JOBS=false` evita o disparo de jobs externos. `SEED_DEMO_DATA=true` carrega a demonstração durante a inicialização. O código também lê variáveis opcionais para as integrações, como credenciais de Google, Mercado Pago, Meta/Twilio, SendGrid, Cloudinary e Focus NFe; configure-as apenas quando for utilizar a integração correspondente.

## Instalação

É necessário ter um MongoDB disponível no endereço definido em `MONGODB_URI`.

```powershell
npm ci
```

## Executando localmente

Para iniciar em modo normal:

```powershell
npm start
```

Para desenvolvimento com reinicialização automática, o projeto também oferece:

```powershell
npm run dev
```

A API é iniciada, por padrão, em `http://localhost:3000`.

## Seed de demonstração

O script de carga está disponível diretamente:

```powershell
npm run seed:demo
```

Como alternativa, defina `SEED_DEMO_DATA=true` no `.env` antes de executar `npm start`; o `server.js` chama a carga de demonstração durante a inicialização. Use esses dados apenas no ambiente local.

## Health check

Com a API em execução, consulte:

```text
GET http://localhost:3000/api/health
```

## Documentação da API

O arquivo [API_DOCUMENTATION.md](API_DOCUMENTATION.md) atualmente detalha a API de templates de WhatsApp. Ele não é uma referência completa para todos os módulos.

Os endpoints de relatórios implementados são protegidos e geram PDFs:

```text
GET /api/relatorios/servicos/pdf
GET /api/relatorios/financeiro/pdf
GET /api/relatorios/orcamentos/pdf
GET /api/relatorios/agendamentos/pdf
```

Consulte os arquivos em `src/routes/` para a lista de rotas por módulo e seus middlewares.
