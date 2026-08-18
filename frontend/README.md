# Faz & Resolve — Frontend

## Sobre

Esta é a aplicação web do Faz & Resolve. Ela oferece a interface para os fluxos administrativos e operacionais atendidos pela API: autenticação, painel, clientes, pedidos/orçamentos, agenda, financeiro e demais módulos disponíveis conforme permissões e plano da conta.

## Tecnologias

- React 18 com Create React App.
- React Router para rotas da aplicação.
- Axios e TanStack React Query para comunicação e estado de dados remotos.
- Bootstrap, Tailwind CSS, Chart.js e ApexCharts para interface e visualizações.
- Integrações de interface com Mercado Pago e Google Maps/Google OAuth, condicionadas à configuração de ambiente.

## Principais telas e módulos

- Dashboard, pedidos, clientes, membros e agenda.
- Financeiro, relatórios e notas fiscais.
- Fornecedores, estoque, catálogo e modelos de serviço.
- Configurações, cobrança/assinaturas e pagamentos.
- Portal do cliente, páginas públicas de orçamento/status e recuperação de senha.
- Templates de WhatsApp, inbox e visibilidade de mercado, quando liberados para a conta.

## Configuração

Crie o arquivo local de variáveis a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Variáveis disponíveis no exemplo:

```text
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_GOOGLE_CLIENT_ID=             # opcional
REACT_APP_MERCADO_PAGO_PUBLIC_KEY=      # opcional
```

A API local é o valor padrão de `REACT_APP_API_URL`. As chaves opcionais só são necessárias para os respectivos fluxos de Google e Mercado Pago.

## Executando localmente

Com a API e o MongoDB em execução, instale as dependências e inicie o servidor de desenvolvimento na porta 3001:

```powershell
npm ci
$env:PORT = 3001
npm start
```

Abra [http://localhost:3001](http://localhost:3001). Para gerar a build estática, use:

```powershell
npm run build
```

## Comunicação com a API

O cliente HTTP usa `REACT_APP_API_URL`; sem configuração explícita, o fallback também é `http://localhost:3000/api`. A API deve estar disponível nessa origem e ter `FRONTEND_URL=http://localhost:3001` no ambiente local para os fluxos que dependem de redirecionamento.

Para a configuração da API, dados de demonstração e health check, consulte o [README do backend](../Backend/README.md).
