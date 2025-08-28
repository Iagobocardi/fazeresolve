// PASSO 1: Carrega as variáveis de ambiente
require('dotenv').config();
require('./src/jobs/lembretes.job');
require('./src/jobs/billing.job.js'); // <-- Adiciona o novo job

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
const publicRoutes = require('./src/routes/public.routes.js');
const despesasRoutes = require('./src/routes/despesas.routes.js');
const produtosRoutes = require('./src/routes/produtos.routes.js');
const authRoutes = require('./src/routes/auth.routes.js');
const portalClienteRoutes = require('./src/routes/portalCliente.routes.js');
const agendamentoRoutes = require('./src/routes/agendamentos.routes.js');
const clienteRoutes = require('./src/routes/clientes.routes.js');
const financeiroRoutes = require('./src/routes/financeiro.routes.js');
const orcamentoRoutes = require('./src/routes/orcamentos.routes.js');
const relatorioRoutes = require('./src/routes/relatorios.routes.js');
const servicoRoutes = require('./src/routes/servicos.routes.js');
const whatsappRoutes = require('./src/routes/whatsapp.routes.js');
const statsRoutes = require('./src/routes/stats.routes.js');
const dashboardRoutes = require('./src/routes/dashboard.routes.js');
const fornecedorRoutes = require('./src/routes/fornecedores.routes.js');
const configuracaoRoutes = require('./src/routes/configuracao.routes.js');
const produtosFornecedorRoutes = require('./src/routes/produtosFornecedor.routes.js');
const checklistRoutes = require('./src/routes/checklist.routes.js');
const estoqueRoutes = require('./src/routes/estoque.routes.js');
const uploadRoutes = require('./src/routes/upload.routes.js');
const conversaRoutes = require('./src/routes/conversa.routes.js');
const adminRoutes = require('./src/routes/admin.routes.js');
const whatsappTemplateRoutes = require('./src/routes/whatsappTemplates.routes.js');
const subscriptionRoutes = require('./src/routes/subscription.routes.js');
const mercadoPagoRoutes = require('./src/routes/mercadoPago.routes.js');
const providerRoutes = require('./src/routes/provider.routes.js'); // <-- Importa a nova rota
const focusnfeRoutes = require('./src/routes/focusnfe.routes.js');
// Importação do Middleware de Erro
const errorMiddleware = require('./src/middlewares/error.middleware');
const adminAuth = require('./src/middlewares/adminAuth.middleware.js');
const checkSubscription = require('./src/middlewares/checkSubscription.middleware.js');
// PASSO 3: Inicialização da Aplicação Express
const app = express();

// Log de "Canário" - para ver todas as requisições que chegam
app.use((req, res, next) => {
  console.log(`[CANARY-LOG] Requisição recebida: ${req.method} ${req.originalUrl}`);
  next();
});

// PASSO 4: Conectar à Base de Dados
connectDB();

// PASSO 5: Middlewares Essenciais (ANTES DAS ROTAS)
// Lista de domínios que podem fazer pedidos à sua API
const allowedOrigins = [
    'http://localhost:3000', // Para desenvolvimento local
    'https://app.fazeresolve.com' // O seu domínio de produção
];

// Adiciona a URL do app do .env se ela existir
if (process.env.APP_URL) {
    allowedOrigins.push(process.env.APP_URL);
}

const corsOptions = {
    origin: function (origin, callback) {
        // Permite pedidos sem 'origin' (como Postman) ou se a origem estiver na lista
        // if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        //     callback(null, true);
        // } else {
        //     callback(new Error('A política de CORS para este site não permite acesso da origem especificada.'));
        // }
        callback(null, true); // Permite todas as origens
    },
    credentials: true, // Importante para cookies e autorização
};

app.use(cors(corsOptions));
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
app.use('/api/clientes', adminAuth, checkSubscription, clienteRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/orcamentos', adminAuth, checkSubscription, orcamentoRoutes);
app.use('/api/relatorios', relatorioRoutes);
app.use('/api/servicos', servicoRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/stats', adminAuth, statsRoutes);
app.use('/api/dashboard', adminAuth, dashboardRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/despesas', despesasRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/portal-cliente', portalClienteRoutes);
app.use('/api/fornecedores', fornecedorRoutes);
app.use('/api/configuracoes', adminAuth, configuracaoRoutes);
app.use('/api/produtos-fornecedor', produtosFornecedorRoutes); // Rota corrigida para evitar conflito
app.use('/api/checklist', checklistRoutes); // Rota corrigida para evitar conflito
app.use('/api/google', googleRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/conversas', adminAuth, conversaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp/templates', whatsappTemplateRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/mercado-pago', mercadoPagoRoutes);
app.use('/api/provider', providerRoutes); // <-- Adiciona a nova rota ao app
app.use('/api/focusnfe', adminAuth, focusnfeRoutes);

const invoiceRoutes = require('./src/routes/invoices.routes.js');
app.use('/api/invoices', invoiceRoutes);


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
