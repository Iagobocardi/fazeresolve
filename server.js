// No seu arquivo principal do servidor (ex: app.js ou server.js)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Outras configurações e importações de rotas
const connectDB = require('./src/config/database'); // Exemplo, se você tiver
const agendamentoRoutes = require('./src/routes/agendamentos.routes');
const clienteRoutes = require('./src/routes/clientes.routes');
const financeiroRoutes = require('./src/routes/financeiro.routes');
const orcamentoRoutes = require('./src/routes/orcamentos.routes');
const relatorioRoutes = require('./src/routes/relatorios.routes');
const servicoRoutes = require('./src/routes/servicos.routes');
const whatsappRoutes = require('./src/routes/whatsapp.routes.js'); // Rota do WhatsApp

const errorMiddleware = require('./src/middlewares/error.middleware');

// Conectar ao MongoDB
connectDB();  // Descomente se estiver usando MongoDB e o arquivo database.js

// Middlewares
app.use(express.json()); // Para parsear JSON no corpo das requisições

// Rotas da API
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/orcamentos', orcamentoRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/servicos', servicoRoutes);
// ROTA DE TESTE PARA DEBUG
app.post('/api/whatsapp/webhook', (req, res) => {
  console.log('!!! ROTA DE TESTE NO SERVER.JS FOI ACIONADA !!!');
  res.status(200).send('<Response><Message>Teste recebido com sucesso!</Message></Response>');
});
app.use('/api/whatsapp', whatsappRoutes); // Monta as rotas do WhatsApp sob /api/whatsapp

// <<< --- ADICIONE ESTA ROTA PARA A RAIZ --- >>>
app.get('/', (req, res) => {
  res.send('<h1>Servidor Express Rodando!</h1><p>Bem-vindo à API.</p>');
});
// <<< ------------------------------------ >>>

// Middleware de tratamento de erros (deve ser o último)
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});