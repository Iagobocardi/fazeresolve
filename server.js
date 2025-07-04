// Arquivo: server.js (ou o seu ficheiro de entrada principal)

// PASSO 1: Carrega as variáveis de ambiente do ficheiro .env
// Esta deve ser a PRIMEIRA linha de código a ser executada.
require('dotenv').config();
require('./src/jobs/satisfactionSurvey.js');

// PASSO 2: Bloco de verificação para sabermos se as variáveis foram carregadas
console.log('====================================');
console.log('INICIANDO O SERVIDOR FAZ & RESOLVE');
console.log('Número do Prestador carregado:', process.env.PRESTADOR_TELEFONE);
console.log('====================================');

// PASSO 3: Importações principais da aplicação
const express = require('express');
const connectDB = require('./src/config/database'); // Assumindo que este ficheiro existe
const cors = require('cors'); // Importa o pacote
const publicRoutes = require('./src/routes/public.routes');


// PASSO 4: Inicialização da aplicação Express
const app = express();
app.use(cors()); // Diz à sua aplicação para permitir pedidos de outros "endereços"
// PASSO 5: Conectar à Base de Dados
connectDB();

// PASSO 6: Middlewares essenciais (ANTES DAS ROTAS)
// Permitem que o servidor leia JSON e dados de formulários.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PASSO 7: Importação das Rotas
const agendamentoRoutes = require('./src/routes/agendamentos.routes');
const clienteRoutes = require('./src/routes/clientes.routes');
const financeiroRoutes = require('./src/routes/financeiro.routes');
const orcamentoRoutes = require('./src/routes/orcamentos.routes');
const relatorioRoutes = require('./src/routes/relatorios.routes');
const servicoRoutes = require('./src/routes/servicos.routes');
const whatsappRoutes = require('./src/routes/whatsapp.routes.js');
const errorMiddleware = require('./src/middlewares/error.middleware');
const statsRoutes = require('./src/routes/stats.routes.js');
const dashboardRoutes = require('./src/routes/dashboard.routes');

// PASSO 8: Utilização das Rotas na API
app.use('/api/agendamentos', agendamentoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/orcamentos', orcamentoRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/servicos', servicoRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);


// Rota de teste para verificar se o servidor está online
app.get('/', (req, res) => {
  res.send('<h1>Servidor Faz&Resolve Rodando!</h1>');
});

// PASSO 9: Middleware de Erro (SEMPRE POR ÚLTIMO)
app.use(errorMiddleware);

// PASSO 10: Iniciar o Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Faz&Resolve a correr na porta ${PORT}`);
});
