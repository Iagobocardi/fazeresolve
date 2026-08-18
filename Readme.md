# Faz & Resolve — demonstração local

Este diretório reúne o frontend React e a API Node/Express do Faz & Resolve. A forma mais simples de executá-los para uma apresentação é pelo Docker:

```powershell
docker compose up --build
```

Depois da primeira inicialização, abra `http://localhost:3001` e entre com:

- E-mail: `demo@fazeresolve.local`
- Senha: `FazResolve123!`

O compose inicia MongoDB, API e frontend; também carrega dados seguros de demonstração, sem integrar pagamentos, WhatsApp ou Google. Verifique a API em `http://localhost:3000/api/health`.

Para encerrar sem apagar os dados: `docker compose down`. Para reiniciar do zero, remova o volume apenas se desejar apagar os dados: `docker compose down -v`.
