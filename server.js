// PASSO 1: Carrega as variáveis de ambiente
require('dotenv').config();
require('./src/jobs/lembretes.job');
require('./src/jobs/billing.job.js');
require('./src/jobs/gracePeriod.job.js');
require('./src/jobs/whatsappSender.job.js'); // Adiciona o novo job

console.log('====================================');
console.log('INICIANDO O SERVIDOR FAZ & RESOLVE');
console.log('Número do Prestador carregado:', process.env.PRESTADOR_TELEFONE);
console.log('====================================');

// PASSO 2: Importações essenciais
const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./src/config/database');

// Importação de TODOS os arquivos de rota
const adminRoutes = require('./src/routes/admin.routes.js');
const agendamentoRoutes = require('./src/routes/agendamentos.routes.js');
const authRoutes = require('./src/routes/auth.routes.js');
const checklistRoutes = require('./src/routes/checklist.routes.js');
const clienteRoutes = require('./src/routes/clientes.routes.js');
const configuracaoRoutes = require('./src/routes/configuracao.routes.js');
const conversaRoutes = require('./src/routes/conversa.routes.js');
const dashboardRoutes = require('./src/routes/dashboard.routes.js');
const despesasRoutes = require('./src/routes/despesas.routes.js');
const estoqueRoutes = require('./src/routes/estoque.routes.js');
const financeiroRoutes = require('./src/routes/financeiro.routes.js');
const focusnfeRoutes = require('./src/routes/focusnfe.routes.js');
const fornecedorRoutes = require('./src/routes/fornecedores.routes.js');
const googleRoutes = require('./src/routes/google.routes.js');
const invoiceRoutes = require('./src/routes/invoices.routes.js');
const membroRoutes = require('./src/routes/membros.routes.js');
const mercadoPagoRoutes = require('./src/routes/mercadoPago.routes.js');
const orcamentoRoutes = require('./src/routes/orcamentos.routes.js');
const permissoesRoutes = require('./src/routes/permissoes.routes.js');
const portalClienteRoutes = require('./src/routes/portalCliente.routes.js');
const produtosRoutes = require('./src/routes/produtos.routes.js');
const produtosFornecedorRoutes = require('./src/routes/produtosFornecedor.routes.js');
const providerRoutes = require('./src/routes/provider.routes.js');
const publicRoutes = require('./src/routes/public.routes.js');
const relatorioRoutes = require('./src/routes/relatorios.routes.js');
const servicoRoutes = require('./src/routes/servicos.routes.js');
const statsRoutes = require('./src/routes/stats.routes.js');
const subscriptionRoutes = require('./src/routes/subscription.routes.js');
const uploadRoutes = require('./src/routes/upload.routes.js');
const whatsappRoutes = require('./src/routes/whatsapp.routes.js');
const whatsappTemplateRoutes = require('./src/routes/whatsappTemplates.routes.js');
const utilsRoutes = require('./src/routes/utils.routes.js');

// Importação do Middleware
const errorMiddleware = require('./src/middlewares/error.middleware');
const authMiddleware = require('./src/middlewares/auth.middleware.js'); // O único middleware de autenticação de prestador necessário
const checkSubscription = require('./src/middlewares/checkSubscription.middleware.js');

const app = express();

// PASSO 4: Conectar à Base de Dados (movido para startServer)

// PASSO 5: Middlewares Essenciais

const cors = require('cors');

// Configuração de CORS explícita para domínios permitidos
const allowedOrigins = [
    'https://app.fazeresolve.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173', // Porta comum para Vite
    'https://accounts.google.com',
];

const corsOptions = {
    origin: (origin, callback) => {
        // Permite requisições sem 'origin' (como Postman), de origens na lista,
        // ou a origem "null" que alguns browsers enviam.
        if (!origin || origin === "null" || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`Acesso não permitido por CORS. Origem: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'SEU_SEGREDO_DE_SESSAO_SUPER_SECRETO',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// PASSO 6: Utilização das Rotas na API

// Rotas Públicas ou com Autenticação Própria
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/portal-cliente', portalClienteRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/mercado-pago', mercadoPagoRoutes);
app.use('/api/admin', adminRoutes);

// --- Rotas Protegidas do Prestador ---
const providerAuthMiddlewares = [authMiddleware, checkSubscription]; // <-- A CORREÇÃO
app.use('/api/agendamentos', providerAuthMiddlewares, agendamentoRoutes);
app.use('/api/clientes', providerAuthMiddlewares, clienteRoutes);
app.use('/api/financeiro', providerAuthMiddlewares, financeiroRoutes);
app.use('/api/orcamentos', providerAuthMiddlewares, orcamentoRoutes);
app.use('/api/relatorios', providerAuthMiddlewares, relatorioRoutes);
app.use('/api/servicos', providerAuthMiddlewares, servicoRoutes);
app.use('/api/whatsapp/templates', providerAuthMiddlewares, whatsappTemplateRoutes);
app.use('/api/whatsapp', providerAuthMiddlewares, whatsappRoutes);
app.use('/api/stats', providerAuthMiddlewares, statsRoutes);
app.use('/api/dashboard', providerAuthMiddlewares, dashboardRoutes);
app.use('/api/despesas', providerAuthMiddlewares, despesasRoutes);
app.use('/api/produtos', providerAuthMiddlewares, produtosRoutes);
app.use('/api/fornecedores', providerAuthMiddlewares, fornecedorRoutes);
app.use('/api/configuracoes', configuracaoRoutes); // <-- CORREÇÃO APLICADA AQUI
app.use('/api/produtos-fornecedor', providerAuthMiddlewares, produtosFornecedorRoutes);
app.use('/api/checklist', providerAuthMiddlewares, checklistRoutes);
app.use('/api/google', providerAuthMiddlewares, googleRoutes);
app.use('/api/estoque', providerAuthMiddlewares, estoqueRoutes);
app.use('/api/upload', providerAuthMiddlewares, uploadRoutes);
app.use('/api/conversas', providerAuthMiddlewares, conversaRoutes);
app.use('/api/whatsapp/templates', providerAuthMiddlewares, whatsappTemplateRoutes);
app.use('/api/provider', providerAuthMiddlewares, providerRoutes);
app.use('/api/focusnfe', providerAuthMiddlewares, focusnfeRoutes);
app.use('/api/permissoes', providerAuthMiddlewares, permissoesRoutes);
app.use('/api/invoices', providerAuthMiddlewares, invoiceRoutes);
app.use('/api/membros', providerAuthMiddlewares, membroRoutes);
app.use('/api/utils', providerAuthMiddlewares, utilsRoutes);


// Rota de teste
app.get('/', (req, res) => {
    res.send('<h1>Servidor Faz&Resolve Rodando!</h1>');
});

// PASSO 7: Middleware de Erro
app.use(errorMiddleware);

// PASSO 8: Iniciar o Servidor de forma segura
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Servidor Faz&Resolve a correr na porta ${PORT}`);
        });
    } catch (error) {
        console.error("Falha ao iniciar o servidor:", error);
        process.exit(1);
    }
};

startServer();
