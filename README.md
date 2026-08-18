# Faz & Resolve

O Faz & Resolve é uma aplicação SaaS de gestão para prestadores de serviços e pequenos negócios. O projeto reúne, em uma interface web e uma API REST, recursos administrativos e operacionais que apoiam o acompanhamento do trabalho diário.

## Objetivo do projeto

O projeto explora a centralização de informações que normalmente ficam dispersas entre controles manuais: cadastro de clientes, pedidos e orçamentos, agenda, financeiro, estoque, fornecedores e acompanhamento da operação. Também inclui relatórios e fluxos de relacionamento com clientes.

## Principais funcionalidades

- Autenticação, recuperação de senha e controle de acesso por usuário, plano e permissões.
- Gestão de clientes, membros da equipe e portal do cliente.
- Cadastro e acompanhamento de pedidos/orçamentos, incluindo materiais, custos, pagamentos, documentos e histórico.
- Agenda de serviços e visualizações no painel (dashboard).
- Controle financeiro, despesas e transações.
- Produtos, movimentação de estoque, fornecedores, catálogo e modelos de serviço.
- Relatórios em PDF de serviços, financeiro, orçamentos e agendamentos.
- Notas fiscais, assinaturas e fluxos de pagamento.
- Templates e automações relacionadas ao WhatsApp, quando configuradas.

## Tecnologias

### Frontend

- React 18 e Create React App.
- React Router, Axios e TanStack React Query.
- Bootstrap, Tailwind CSS e bibliotecas de gráficos (Chart.js e ApexCharts).

### Backend

- Node.js e Express.
- MongoDB e Mongoose.
- JWT, sessões e validação de requisições.
- Geração de PDFs com PDFKit e pdfmake.

### Infraestrutura

- Docker e Docker Compose.
- Nginx na imagem de produção do frontend.

### Integrações presentes no código

O código contém integrações opcionais com Mercado Pago, APIs do Google, WhatsApp (Meta OAuth e fluxo legado com Twilio), SendGrid, Cloudinary e Focus NFe. Elas dependem de variáveis de ambiente e credenciais próprias. No cenário de demonstração, os jobs externos são mantidos desabilitados; portanto, ele não deve depender de chamadas reais a esses serviços.

## Arquitetura

```text
Aplicação React (frontend)
          ↓ HTTP/JSON
       API REST (Express)
          ↓ Mongoose
       MongoDB
```

O frontend consome a API pelo endereço configurado em `REACT_APP_API_URL`. A API concentra as regras de negócio, autenticação e acesso aos dados do MongoDB.

## Estrutura do projeto

```text
fazeresolve/
├── Backend/             # API, regras de negócio, seed e imagem Docker
├── frontend/            # aplicação React e imagem Docker
├── docker-compose.yml   # definição do ambiente local
├── README.md
└── .gitignore
```

## Executando com Docker

O ambiente foi definido para subir MongoDB, API e frontend com:

```powershell
docker compose up --build
```

Após a inicialização, os endereços esperados são:

```text
Frontend:     http://localhost:3001
API:          http://localhost:3000
Health check: http://localhost:3000/api/health
```

> Atenção: neste checkout, o `docker-compose.yml` referencia os contextos de build `./fazeresolve-fix-api-errors-and-update-landing-page` e `./az-e-resolve-frontend-bug-saldo-devedor-investigation`, que não estão presentes no repositório. Assim, o comando acima não conclui sem corrigir esses caminhos para `./Backend` e `./frontend` (ou restaurar os diretórios esperados). Esta documentação não altera a configuração Docker.

## Conta de demonstração

```text
E-mail: demo@fazeresolve.local
Senha: FazResolve123!
```

> Estas credenciais pertencem exclusivamente ao ambiente local de demonstração.

Com `SEED_DEMO_DATA=true`, a API executa a carga de dados de demonstração ao iniciar. Não utilize essa conta ou os segredos de exemplo em produção.

## Desenvolvimento sem Docker

É necessário ter um MongoDB acessível em `mongodb://localhost:27017/fazeresolve` (ou ajustar `MONGODB_URI` no backend).

Em um terminal, inicie a API:

```powershell
cd Backend
Copy-Item .env.example .env
npm ci
npm start
```

Em outro terminal, inicie o frontend na porta 3001:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
$env:PORT = 3001
npm start
```

Por padrão, `frontend/.env.example` aponta `REACT_APP_API_URL` para `http://localhost:3000/api`. Consulte os READMEs de cada componente para opções de seed, variáveis e detalhes adicionais.

## Screenshots

<!-- Adicionar screenshot do Dashboard aqui -->
<!-- Adicionar screenshot de Clientes aqui -->
<!-- Adicionar screenshot de Financeiro aqui -->
<!-- Adicionar screenshot de Pedidos/Orçamentos aqui -->
<!-- Adicionar screenshot de Estoque aqui -->

## Documentação técnica

- [Documentação do frontend](frontend/README.md)
- [Documentação da API](Backend/README.md)
- [Documentação existente dos templates de WhatsApp](Backend/API_DOCUMENTATION.md)

## Status do projeto

Projeto autoral para desenvolvimento, experimentação e demonstração de conceitos de engenharia de software. O repositório contém recursos em evolução e integrações que exigem configuração externa para uso fora do ambiente local.
