# Faz & Resolve — API para demonstração

Copie `.env.example` para `.env`, instale com `npm ci`, execute `npm run seed:demo` e inicie com `npm start`.

Para iniciar a solução completa, a partir da pasta pai, use `docker compose up --build`. As credenciais são `demo@fazeresolve.local` / `FazResolve123!`.

---

Para o Relatório de Serviços:

    Método: GET
    URL: http://localhost:3000/api/relatorios/servicos/pdf

Para o Relatório Financeiro:

    Método: GET
    URL: http://localhost:3000/api/relatorios/financeiro/pdf

Para o Relatório de Orçamentos:

    Método: GET
    URL: http://localhost:3000/api/relatorios/orcamentos/pdf

Para o Relatório de Agendamentos:

    Método: GET
    URL: http://localhost:3000/api/relatorios/agendamentos/pdf
