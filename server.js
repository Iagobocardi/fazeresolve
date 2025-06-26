const express = require('express');
require('dotenv').config(); // Garante que as variáveis de ambiente são carregadas primeiro

const app = express();
const PORT = process.env.PORT || 3000;

// Importações
const connectDB = require('./src/config/database');
const agendamentoRoutes = require('./src/routes/agendamentos.routes');
const clienteRoutes = require('./src/routes/clientes.routes');
const financeiroRoutes = require('./src/routes/financeiro.routes');
const orcamentoRoutes = require('./src/routes/orcamentos.routes');
const relatorioRoutes = require('./src/routes/relatorios.routes');
const servicoRoutes = require('./src/routes/servicos.routes');
const whatsappRoutes = require('./src/routes/whatsapp.routes.js');
const errorMiddleware = require('./src/middlewares/error.middleware');

// Conectar ao MongoDB
connectDB();

// Middlewares (ANTES DAS ROTAS)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/orcamentos', orcamentoRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/servicos', servicoRoutes);
app.use('/api/whatsapp', whatsappRoutes);

app.get('/', (req, res) => {
  res.send('<h1>Servidor Faz&Resolve Rodando!</h1>');
});

// Middleware de Erro (SEMPRE POR ÚLTIMO)
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Servidor Faz&Resolve a correr na porta ${PORT}`);
});
