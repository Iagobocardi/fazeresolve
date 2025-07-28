// PASSO 1: Carrega as variáveis de ambiente
require('dotenv').config();
require('./src/jobs/lembretes.job');

console.log('====================================');
console.log('INICIANDO O SERVIDOR FAZ & RESOLVE');
console.log('Número do Prestador carregado:', process.env.PRESTADOR_TELEFONE);
console.log('====================================');

// PASSO 2: Importações essenciais
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path'); // Importação que estava faltando
const connectDB = require('./src/config/database'); // Conexão com o banco
const googleRoutes = require('./src/routes/google.routes.js');

// Importação das rotas
const publicRoutes = require('./src/routes/public.routes');
const despesasRoutes = require('./src/routes/despesas.routes');
const produtosRoutes = require('./src/routes/produtos.routes.js');
const authRoutes = require('./src/routes/auth.routes');
const portalClienteRoutes = require('./src/routes/portalCliente.routes');
const agendamentoRoutes = require('./src/routes/agendamentos.routes');
const clienteRoutes = require('./src/routes/clientes.routes');
const financeiroRoutes = require('./src/routes/financeiro.routes');
const orcamentoRoutes = require('./src/routes/orcamentos.routes');
const relatorioRoutes = require('./src/routes/relatorios.routes');
const servicoRoutes = require('./src/routes/servicos.routes');
const whatsappRoutes = require('./src/routes/whatsapp.routes.js');
const statsRoutes = require('./src/routes/stats.routes.js');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const fornecedorRoutes = require('./src/routes/fornecedores.routes.js');
const configuracaoRoutes = require('./src/routes/configuracao.routes.js');
const produtosFornecedorRoutes = require('./src/routes/produtosFornecedor.routes.js');
const checklistRoutes = require('./src/routes/checklist.routes.js');

// Importação do Middleware de Erro
const errorMiddleware = require('./src/middlewares/error.middleware');

// PASSO 3: Inicialização da Aplicação Express
const app = express();

// PASSO 4: Conectar à Base de Dados
connectDB();

// PASSO 5: Middlewares Essenciais (ANTES DAS ROTAS)
app.use(cors()); // Habilita o CORS para todas as rotas
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Habilita o parsing de dados de formulários
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); // Serve arquivos estáticos da pasta uploads
app.use(express.static('public')); // Serve arquivos estáticos da pasta public

// Configuração da Sessão (unificada)
app.use(session({
    secret: process.env.SESSION_SECRET || 'SEU_SEGREDO_DE_SESSAO_SUPER_SECRETO', // Use uma variável de ambiente!
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' } // Em produção, use `true` com HTTPS
}));

// PASSO 6: Utilização das Rotas na API
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
app.use('/api/despesas', despesasRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/portal-cliente', portalClienteRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api/configuracoes', configuracaoRoutes);
app.use('/api/produtos-fornecedor', produtosFornecedorRoutes); // Rota corrigida para evitar conflito
app.use('/api/checklist', checklistRoutes); // Rota corrigida para evitar conflito
app.use('/api/google', googleRoutes);

// Rota de teste para verificar se o servidor está online
app.get('/', (req, res) => {
    res.send('<h1>Servidor Faz&Resolve Rodando!</h1>');
});

// PASSO 7: Middleware de Erro (SEMPRE DEPOIS DAS ROTAS)
app.use(errorMiddleware);

// PASSO 8: Iniciar o Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Faz&Resolve a correr na porta ${PORT}`);
});
