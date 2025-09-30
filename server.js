// PASSO 1: Carrega as variáveis de ambiente
require('dotenv').config();
require('./src/jobs/lembretes.job');
require('./src/jobs/billing.job.js');
require('./src/jobs/gracePeriod.job.js');
require('./src/jobs/whatsappSender.job.js'); // Adiciona o novo job
require('./src/jobs/dunning.job.js'); // Adiciona o novo job de dunning (v1.1)

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
const providerPublicRoutes = require('./src/routes/provider.public.routes.js'); // Rota pública
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
const authMiddleware = require('./src/middlewares/auth.middleware.js');
const checkSubscription = require('./src/middlewares/checkSubscription.middleware.js');

const app = express();

// PASSO 5: Middlewares Essenciais
const cors = require('cors');
// Lista de origens permitidas, agora usando Regex para mais flexibilidade
const allowedOrigins = [
    'https://app.fazeresolve.com',
    /^https:\/\/(www\.)?fazeresolve\.onrender\.com$/, // Permite com e sem 'www'
    /^http:\/\/localhost(:\d+)?$/,                 // Permite qualquer porta em localhost
    'https://accounts.google.com',
];

const corsOptions = {
    origin: allowedOrigins,
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
app.use('/api/provider', providerPublicRoutes); // <-- ROTA PÚBLICA DO PRESTADOR

// --- Rotas Protegidas do Prestador ---
const providerAuthMiddlewares = [authMiddleware, checkSubscription];
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
app.use('/api/configuracoes', configuracaoRoutes);
app.use('/api/produtos-fornecedor', providerAuthMiddlewares, produtosFornecedorRoutes);
app.use('/api/checklist', providerAuthMiddlewares, checklistRoutes);
app.use('/api/google', providerAuthMiddlewares, googleRoutes);
app.use('/api/estoque', providerAuthMiddlewares, estoqueRoutes);
app.use('/api/upload', providerAuthMiddlewares, uploadRoutes);
app.use('/api/conversas', providerAuthMiddlewares, conversaRoutes);
app.use('/api/provider', providerAuthMiddlewares, providerRoutes); // <-- ROTAS PRIVADAS DO PRESTADOR
app.use('/api/focusnfe', providerAuthMiddlewares, focusnfeRoutes);
app.use('/api/permissoes', providerAuthMiddlewares, permissoesRoutes);
app.use('/api/invoices', providerAuthMiddlewares, invoiceRoutes);
app.use('/api/membros', providerAuthMiddlewares, membroRoutes);

// Importação e uso das novas rotas de catálogo
const catalogoRoutes = require('./src/routes/catalogo.routes.js');
app.use('/api/catalogo', providerAuthMiddlewares, catalogoRoutes);

// Importação e uso das novas rotas de modelos de serviço
const modelosDeServicoRoutes = require('./src/routes/modelosDeServico.routes.js');
app.use('/api/modelos', providerAuthMiddlewares, modelosDeServicoRoutes);

const pixRoutes = require('./src/routes/pix.routes.js');
app.use('/api/pix', pixRoutes);
app.use('/api/utils', providerAuthMiddlewares, utilsRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.send('<h1>Servidor Faz&Resolve Rodando!</h1>');
});

// PASSO 7: Middleware de Erro
app.use(errorMiddleware);

// PASSO 8: Iniciar o Servidor de forma segura
const PORT = process.env.PORT || 3000;

const CatalogoMercado = require('./src/models/catalogoMercado.model');

const seedCatalogoMercado = async () => {
    try {
        const count = await CatalogoMercado.countDocuments({ areasDeAtuacao: 'Tapeçaria' });
        if (count > 0) {
            console.log('Catálogo de Mercado (Tapeçaria) já populado. Nenhuma ação necessária.');
            return;
        }

        const catalogoMercadoData = [
            { nome: "ACQUASUMMER (501 AO 548)", categoria: "Tecidos (ACQUASUMMER 2025)", precoMedioMin: 39.00, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ACQUABLOCK (300 AO 347)", categoria: "Tecidos (ACQUABLOCK)", precoMedioMin: 52.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "20.001-01 AO 20.001-48", categoria: "Tecidos (ACQUABLOCK INTERNO)", precoMedioMin: 52.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CAC (100 AO 147)", categoria: "Tecidos (CANCUN)", precoMedioMin: 39.10, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MÓDENA (01 AO 32)", categoria: "Tecidos (MÓDENA)", precoMedioMin: 44.90, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "KANSAS (01, 03,10, 13, 17, 19, 20, 23, 28, 33, 36 E 37)", categoria: "Tecidos (MONARCA EDANKORO KANSAS)", precoMedioMin: 48.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 04", categoria: "Tecidos (MONARCA)", precoMedioMin: 75.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 05", categoria: "Tecidos (MONARCA)", precoMedioMin: 75.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 06", categoria: "Tecidos (MONARCA)", precoMedioMin: 72.88, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 07", categoria: "Tecidos (MONARCA)", precoMedioMin: 75.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 09", categoria: "Tecidos (MONARCA)", precoMedioMin: 75.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 10", categoria: "Tecidos (MONARCA)", precoMedioMin: 72.88, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 17", categoria: "Tecidos (MONARCA)", precoMedioMin: 75.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 18", categoria: "Tecidos (MONARCA)", precoMedioMin: 72.88, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 19", categoria: "Tecidos (MONARCA)", precoMedioMin: 75.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 20", categoria: "Tecidos (MONARCA)", precoMedioMin: 72.88, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 25", categoria: "Tecidos (MONARCA)", precoMedioMin: 75.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 26", categoria: "Tecidos (MONARCA)", precoMedioMin: 72.88, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 28", categoria: "Tecidos (MONARCA)", precoMedioMin: 72.88, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 30", categoria: "Tecidos (MONARCA)", precoMedioMin: 75.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 01", categoria: "Tecidos (MONARCA)", precoMedioMin: 100.93, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 02", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 03", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 08", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 11", categoria: "Tecidos (MONARCA)", precoMedioMin: 100.93, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 12", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 13", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 14", categoria: "Tecidos (MONARCA)", precoMedioMin: 100.93, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 15", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 16", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 21", categoria: "Tecidos (MONARCA)", precoMedioMin: 100.93, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 22", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 23", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 24", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 27", categoria: "Tecidos (MONARCA)", precoMedioMin: 75.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 29", categoria: "Tecidos (MONARCA)", precoMedioMin: 100.93, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 31", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONARCA - 32", categoria: "Tecidos (MONARCA)", precoMedioMin: 105.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-01", categoria: "Tecidos (ORIGENS)", precoMedioMin: 185.42, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-02", categoria: "Tecidos (ORIGENS)", precoMedioMin: 145.94, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-03", categoria: "Tecidos (ORIGENS)", precoMedioMin: 129.28, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-04", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-05", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-06", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-07", categoria: "Tecidos (ORIGENS)", precoMedioMin: 185.42, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-08", categoria: "Tecidos (ORIGENS)", precoMedioMin: 154.77, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-09", categoria: "Tecidos (ORIGENS)", precoMedioMin: 150.74, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-10", categoria: "Tecidos (ORIGENS)", precoMedioMin: 176.02, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-11", categoria: "Tecidos (ORIGENS)", precoMedioMin: 161.35, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-12", categoria: "Tecidos (ORIGENS)", precoMedioMin: 121.52, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-13", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-14", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-15", categoria: "Tecidos (ORIGENS)", precoMedioMin: 154.77, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-16", categoria: "Tecidos (ORIGENS)", precoMedioMin: 140.77, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-17", categoria: "Tecidos (ORIGENS)", precoMedioMin: 133.72, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-18", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-19", categoria: "Tecidos (ORIGENS)", precoMedioMin: 133.95, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-20", categoria: "Tecidos (ORIGENS)", precoMedioMin: 158.39, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-21", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-22", categoria: "Tecidos (ORIGENS)", precoMedioMin: 154.77, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-23", categoria: "Tecidos (ORIGENS)", precoMedioMin: 158.39, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-24", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-25", categoria: "Tecidos (ORIGENS)", precoMedioMin: 176.02, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-26", categoria: "Tecidos (ORIGENS)", precoMedioMin: 131.73, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-27", categoria: "Tecidos (ORIGENS)", precoMedioMin: 133.72, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-28", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-29", categoria: "Tecidos (ORIGENS)", precoMedioMin: 135.13, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-30", categoria: "Tecidos (ORIGENS)", precoMedioMin: 154.77, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-31", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-32", categoria: "Tecidos (ORIGENS)", precoMedioMin: 133.95, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-33", categoria: "Tecidos (ORIGENS)", precoMedioMin: 131.73, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-34", categoria: "Tecidos (ORIGENS)", precoMedioMin: 158.39, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-35", categoria: "Tecidos (ORIGENS)", precoMedioMin: 135.13, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-36", categoria: "Tecidos (ORIGENS)", precoMedioMin: 135.13, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-37", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-38", categoria: "Tecidos (ORIGENS)", precoMedioMin: 133.72, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-39", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-40", categoria: "Tecidos (ORIGENS)", precoMedioMin: 131.73, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-41", categoria: "Tecidos (ORIGENS)", precoMedioMin: 133.95, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-42", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-43", categoria: "Tecidos (ORIGENS)", precoMedioMin: 158.39, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-44", categoria: "Tecidos (ORIGENS)", precoMedioMin: 133.72, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-45", categoria: "Tecidos (ORIGENS)", precoMedioMin: 189.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-46", categoria: "Tecidos (ORIGENS)", precoMedioMin: 149.48, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-47", categoria: "Tecidos (ORIGENS)", precoMedioMin: 140.30, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ORIGENS-48", categoria: "Tecidos (ORIGENS)", precoMedioMin: 131.73, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ACACIA (01 AO 05)", categoria: "Tecidos (TREVO)", precoMedioMin: 36.74, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CEDRO (01 AO 04)", categoria: "Tecidos (TREVO)", precoMedioMin: 36.51, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "BAMBU (01 AO 04)", categoria: "Tecidos (TREVO)", precoMedioMin: 42.95, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "HERA (01 AO 04)", categoria: "Tecidos (TREVO)", precoMedioMin: 43.59, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "FICUS (01 AO 05)", categoria: "Tecidos (TREVO)", precoMedioMin: 47.21, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "IPÊ (01 AO 04)", categoria: "Tecidos (TREVO)", precoMedioMin: 47.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ALEGRO (01 AO 05)", categoria: "Tecidos (AQUARELA)", precoMedioMin: 52.30, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "FLORA (01 AO 09)", categoria: "Tecidos (AQUARELA)", precoMedioMin: 34.99, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MAGENTA (01 AO 07)", categoria: "Tecidos (AQUARELA)", precoMedioMin: 45.30, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MALVA (01 AO 04)", categoria: "Tecidos (AQUARELA)", precoMedioMin: 51.45, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SERENA (01 AO 08)", categoria: "Tecidos (AQUARELA)", precoMedioMin: 39.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "VOLPI (01 AO 07)", categoria: "Tecidos (AQUARELA)", precoMedioMin: 41.65, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CROMA (01 AO 14)", categoria: "Tecidos (ALL COLOURS WATERPROOF)", precoMedioMin: 58.30, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "FUSION (01 AO 21)", categoria: "Tecidos (ALL COLOURS WATERPROOF)", precoMedioMin: 63.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "STONE (01 AO 21)", categoria: "Tecidos (ALL COLOURS WATERPROOF)", precoMedioMin: 51.15, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MARINE BUZIOS (01 AO 07)", categoria: "Tecidos (MARINE)", precoMedioMin: 59.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MARINE IPANEMA (01 AO 04)", categoria: "Tecidos (MARINE)", precoMedioMin: 59.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MARINE ITACARE (01 AO 02)", categoria: "Tecidos (MARINE)", precoMedioMin: 59.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MARINE LEBLON (01 AO 05)", categoria: "Tecidos (MARINE)", precoMedioMin: 59.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MARINE TRANCOSO (01 AO 14)", categoria: "Tecidos (MARINE)", precoMedioMin: 59.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ANDORA (01 AO 06)", categoria: "Tecidos (MONTE CARLO)", precoMedioMin: 34.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "DEGO (01 AO 06)", categoria: "Tecidos (MONTE CARLO)", precoMedioMin: 40.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOANO (01 AO 08)", categoria: "Tecidos (MONTE CARLO)", precoMedioMin: 36.55, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MENTON (01 AO 05)", categoria: "Tecidos (MONTE CARLO)", precoMedioMin: 34.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONACO (01 AO 18)", categoria: "Tecidos (MONTE CARLO)", precoMedioMin: 36.55, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "NICE (01 AO 07)", categoria: "Tecidos (MONTE CARLO)", precoMedioMin: 34.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "VENCE (01 AO 07)", categoria: "Tecidos (MONTE CARLO)", precoMedioMin: 34.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ALASKA (01 AO 14)", categoria: "Tecidos (Nº 001)", precoMedioMin: 25.25, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "DEVA (01 AO 06, 08 AO 10)", categoria: "Tecidos (Nº 001)", precoMedioMin: 27.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SAFIRA (01 AO 04, 06 AO 09)", categoria: "Tecidos (Nº 001)", precoMedioMin: 33.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ASTECA (01 AO 12)", categoria: "Tecidos (Nº 002)", precoMedioMin: 17.48, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ALPES (01 AO 12)", categoria: "Tecidos (Nº 002)", precoMedioMin: 18.95, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SATURNO (01 AO 14)", categoria: "Tecidos (Nº 002)", precoMedioMin: 19.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "URANO (01 AO 08)", categoria: "Tecidos (Nº 003)", precoMedioMin: 26.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MAIA (01 AO 14)", categoria: "Tecidos (Nº 003)", precoMedioMin: 20.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MÉRCURIO (01 AO 09)", categoria: "Tecidos (Nº 003)", precoMedioMin: 23.99, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "JET (01 AO 09)", categoria: "Tecidos (Nº 003)", precoMedioMin: 22.15, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TOPÁZIO (01 AO 07)", categoria: "Tecidos (Nº 004)", precoMedioMin: 44.35, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MILANO (01 AO 06)", categoria: "Tecidos (Nº 004)", precoMedioMin: 43.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "IMPÉRIO (01 AO 12)", categoria: "Tecidos (Nº 004)", precoMedioMin: 53.45, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LUCCA (01 AO 12)", categoria: "Tecidos (Nº 005)", precoMedioMin: 45.45, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ROMA ( 01 AO 08)", categoria: "Tecidos (Nº 005)", precoMedioMin: 40.59, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TIVOLI (01 AO 08)", categoria: "Tecidos (Nº 005)", precoMedioMin: 35.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SAARA (01 AO 04)", categoria: "Tecidos (Nº 005)", precoMedioMin: 28.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SKY (01 AO 07)", categoria: "Tecidos (Nº 005)", precoMedioMin: 32.59, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "BOUCLE TORONTO (01 AO 09)", categoria: "Tecidos (Nº 006)", precoMedioMin: 74.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ONIX (01 AO 06)", categoria: "Tecidos (Nº 006)", precoMedioMin: 68.10, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "DIAMOND (40.003-01 ao 40.003-03)", categoria: "Tecidos (Nº 006)", precoMedioMin: 67.00, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COLUMBIA (40.000-01 AO 40.000-07)", categoria: "Tecidos (Nº 006)", precoMedioMin: 50.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "JADE (01 AO 06)", categoria: "Tecidos (Nº 006)", precoMedioMin: 58.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SHEEP (40.002-01 AO 40.002-04)", categoria: "Tecidos (Nº 006)", precoMedioMin: 70.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "AMASSADO (01 AO 11)", categoria: "Tecidos (TAITÍ II)", precoMedioMin: 14.15, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "INCA (01, 02, 03, 05 AO 26)", categoria: "Tecidos (TAITÍ II)", precoMedioMin: 14.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "PÁVIA (01, 02, 10 AO 12, 14 AO 23)", categoria: "Tecidos (TAITÍ II)", precoMedioMin: 14.10, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TRIESTE (01 AO 40)", categoria: "Tecidos (TRIESTE)", precoMedioMin: 32.89, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ACQUABLOCK (100 AO 157)", categoria: "Tecidos (ACQUABLOCK ÁREA EXTERNA)", precoMedioMin: 47.90, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "BERTIOGA (10 AO 17)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 53.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MUCURI (01 AO 05)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 127.78, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CAMBORIÚ (01 AO 09, 11, 12, 14, 15, 17 AO 20, 24)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 72.25, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "BÚZIOS (01 AO 06)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 115.20, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "GUARUJÁ-02", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 116.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "GUARUJÁ (04 AO 05)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 74.78, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ILHÉUS (01, 03, 04, 05 E 06)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 77.20, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ITACARÉ (01 AO 04)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 107.84, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ITAJAÍ (01 E 02)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 78.56, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MARAGOGI (01, 02 E 03)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 70.20, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TRANCOSO (01 AO 04)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 107.84, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "RIP-STOP-01", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 96.20, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "UBATUBA (01 AO 04)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 107.84, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ILHABELA (01, 02, 03, 07, 08, 09 E 11 AO 14)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 112.79, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "RIVIERA (O1, 02, 03, 06 AO 12)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 95.04, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "IPANEMA (01 AO 04)", categoria: "Tecidos (ANGRA NÁUTICO)", precoMedioMin: 129.49, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CANN (01, 07, 13, 15, 19, 24,26,30,32)", categoria: "Tecidos (CANNES)", precoMedioMin: 190.42, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CANN (02,08,16,21,27,33,35)", categoria: "Tecidos (CANNES)", precoMedioMin: 247.13, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CANN (03,09, 17, 22,25,31,37)", categoria: "Tecidos (CANNES)", precoMedioMin: 200.62, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CANN (04, 10, 14, 18,23, 29,38)", categoria: "Tecidos (CANNES)", precoMedioMin: 279.11, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CANN (05, 11, 39)", categoria: "Tecidos (CANNES)", precoMedioMin: 258.76, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CANN (06,12,20,28,34,36,40)", categoria: "Tecidos (CANNES)", precoMedioMin: 287.83, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CORANO BCO 5583 AO PTO 5584", categoria: "Tecidos (COROPRIME)", precoMedioMin: 25.30, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CORANO JUTA", categoria: "Tecidos (COROPRIME)", precoMedioMin: 27.03, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CORANO MILANO", categoria: "Tecidos (COROPRIME)", precoMedioMin: 27.03, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "NELORE (01 AO 10)", categoria: "Tecidos (COURO)", precoMedioMin: 140.94, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ANGUS (01 AO 10)", categoria: "Tecidos (COURO)", precoMedioMin: 235.00, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MUSTANG (01 AO 08)", categoria: "Tecidos (COURO)", precoMedioMin: 211.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TULI (01, 04, 06 AO 10)", categoria: "Tecidos (COURO)", precoMedioMin: 150.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "VAQUETA (01 AO 24)", categoria: "Tecidos (COURO)", precoMedioMin: 119.63, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CAMURÇA BISON (01 AO 09)", categoria: "Tecidos (COURO)", precoMedioMin: 208.21, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "KANSAS (01 AO 40)", categoria: "Tecidos (EDANKORO)", precoMedioMin: 48.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-01", categoria: "Tecidos (LONDON)", precoMedioMin: 151.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-02", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-03", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-04", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-05", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-06", categoria: "Tecidos (LONDON)", precoMedioMin: 151.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-07", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-08", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-09", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-10", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-11", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-12", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-13", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-14", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-15", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-16", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-17", categoria: "Tecidos (LONDON)", precoMedioMin: 151.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-18", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-19", categoria: "Tecidos (LONDON)", precoMedioMin: 151.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-20", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-21", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-22", categoria: "Tecidos (LONDON)", precoMedioMin: 151.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-23", categoria: "Tecidos (LONDON)", precoMedioMin: 151.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-24", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-25", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-26", categoria: "Tecidos (LONDON)", precoMedioMin: 151.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-27", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-28", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-29", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-30", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-31", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-32", categoria: "Tecidos (LONDON)", precoMedioMin: 151.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-33", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-34", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-35", categoria: "Tecidos (LONDON)", precoMedioMin: 151.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-36", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-37", categoria: "Tecidos (LONDON)", precoMedioMin: 151.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-38", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-39", categoria: "Tecidos (LONDON)", precoMedioMin: 183.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LOND-40", categoria: "Tecidos (LONDON)", precoMedioMin: 121.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA (01 AO 04)", categoria: "Tecidos (MONZA)", precoMedioMin: 304.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA (05 AO 12)", categoria: "Tecidos (MONZA)", precoMedioMin: 374.20, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA (13 AO 30)", categoria: "Tecidos (MONZA)", precoMedioMin: 370.90, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA (31 E 32)", categoria: "Tecidos (MONZA)", precoMedioMin: 179.02, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA (33 AO 36)", categoria: "Tecidos (MONZA)", precoMedioMin: 169.18, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA (37 AO 45)", categoria: "Tecidos (MONZA)", precoMedioMin: 223.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA (46 E 47)", categoria: "Tecidos (MONZA)", precoMedioMin: 173.22, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA (48 E 49)", categoria: "Tecidos (MONZA)", precoMedioMin: 173.22, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA 50", categoria: "Tecidos (MONZA)", precoMedioMin: 179.02, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA (51 E 52)", categoria: "Tecidos (MONZA)", precoMedioMin: 161.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA 53", categoria: "Tecidos (MONZA)", precoMedioMin: 158.32, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MONZA (54, 55 E 56)", categoria: "Tecidos (MONZA)", precoMedioMin: 207.05, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.000-01 AO 10.000-05", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 107.79, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.001-01 AO 10.001-07", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 107.79, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.002-01 AO 10.002-04", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 114.99, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.003-01 AO 10.003-02", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 105.52, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.004-01 AO 10.004-02", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 107.69, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.005-01 AO 10.005-03", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 107.63, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.006-01", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 111.48, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.007-01", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 107.63, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.008-01", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 115.93, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.009-01 AO 10.009-02", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 105.87, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.010-01 AO 10.010-02", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 111.48, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.011-01 AO 10.011-02", categoria: "Tecidos (MUNIQUE)", precoMedioMin: 111.48, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SARJA (500, 501 E 502)", categoria: "Tecidos (SARJA)", precoMedioMin: 63.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SARJA (503 AO 507)", categoria: "Tecidos (SARJA)", precoMedioMin: 66.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SARJA (03, 04 E 38)", categoria: "Tecidos (SARJA)", precoMedioMin: 53.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SARJA (06, 07, 13, 20, 25, 29, 35, 36 E 43)", categoria: "Tecidos (SARJA)", precoMedioMin: 58.10, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SARJA (51, 53, 57, 58, 59, 65, 67, 69, 73 AO 84)", categoria: "Tecidos (SARJA)", precoMedioMin: 58.10, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SARJA (03, 04 E 38)", categoria: "Tecidos (SARJA 2023)", precoMedioMin: 53.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SARJA (06, 07, 13, 20, 25, 29, 35, 36, 43)", categoria: "Tecidos (SARJA 2023)", precoMedioMin: 58.10, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SARJA (51, 53, 57, 58, 59, 65, 67, 69, 73 AO 90)", categoria: "Tecidos (SARJA 2023)", precoMedioMin: 58.10, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SARJA (500, 501 E 502)", categoria: "Tecidos (SARJA 2023)", precoMedioMin: 63.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SARJA (503 AO 507)", categoria: "Tecidos (SARJA 2023)", precoMedioMin: 66.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM PUMA (01 AO 18)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 35.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM VENETO (01 AO 24)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 35.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM BRESCIA (02,03,09,12, 17 AO 20)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 41.13, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM PERFECTO (01 AO 06)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 37.27, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM CASCO (01 AO 14)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 37.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM VICK (01 AO 07)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 38.39, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM DUNAS (01 AO 22)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 37.93, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM BLING (01 AO 09)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 40.88, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM LOTUS (01 AO 17)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 31.81, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM VALENCIA (01 AO 13)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 35.99, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM RAVENA (01 AO 13)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 35.99, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "COURVIM URUGUAY (1621 AO 3777)", categoria: "Tecidos (SINTÉTICOS 2023)", precoMedioMin: 34.00, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TOL (01,02,03,04,05,06,07,09,11,12,13,14,19,20,21E24)", categoria: "Tecidos (TOLEDO)", precoMedioMin: 74.73, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TOL (27,28,29,30,32,33,34,37,38,41,45,46,47,52 E56)", categoria: "Tecidos (TOLEDO)", precoMedioMin: 74.73, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TOL (08,10,16,18,22,26,35,36,42,44,48,49,51E55)", categoria: "Tecidos (TOLEDO)", precoMedioMin: 71.91, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TOL (15,17,23,25,31,39,43,50,53E54)", categoria: "Tecidos (TOLEDO)", precoMedioMin: 74.49, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TOL (40)", categoria: "Tecidos (TOLEDO)", precoMedioMin: 78.10, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TORONTO (01 AO 35)", categoria: "Tecidos (TORONTO)", precoMedioMin: 51.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.022-01", categoria: "Tecidos (VISAGE)", precoMedioMin: 166.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.023-01 AO 10.024-02", categoria: "Tecidos (VISAGE)", precoMedioMin: 145.60, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.025-02", categoria: "Tecidos (VISAGE)", precoMedioMin: 166.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.028-01", categoria: "Tecidos (VISAGE)", precoMedioMin: 184.33, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.029-01, 10.031-01 AO 10.032-02", categoria: "Tecidos (VISAGE)", precoMedioMin: 104.10, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.032-01,10.032-02", categoria: "Tecidos (VISAGE)", precoMedioMin: 114.68, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.033-01, 10.035-01 E 10.035-02", categoria: "Tecidos (VISAGE)", precoMedioMin: 140.77, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.034-01 AO 10.034-03", categoria: "Tecidos (VISAGE)", precoMedioMin: 195.99, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.036-01 E 10.036-02", categoria: "Tecidos (VISAGE)", precoMedioMin: 180.25, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.037-01", categoria: "Tecidos (VISAGE)", precoMedioMin: 150.17, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.039-01 AO 10.039-04", categoria: "Tecidos (VISAGE)", precoMedioMin: 160.06, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.040-01 AO 10.043-01", categoria: "Tecidos (VISAGE)", precoMedioMin: 141.00, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.044-01 E 10.044-02", categoria: "Tecidos (VISAGE)", precoMedioMin: 165.68, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "10.045-01 AO 10.045-03", categoria: "Tecidos (VISAGE)", precoMedioMin: 141.00, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "20.000-01 AO 20.000-06", categoria: "Tecidos (VISAGE)", precoMedioMin: 163.12, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "30.002-1 AO 30.006-09", categoria: "Tecidos (VISAGE)", precoMedioMin: 48.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "40.000-02", categoria: "Tecidos (VISAGE)", precoMedioMin: 50.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "40.002-02", categoria: "Tecidos (VISAGE)", precoMedioMin: 70.50, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "40.004-01 AO 40.004-04", categoria: "Tecidos (VISAGE)", precoMedioMin: 109.30, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ELEGANCE (01 AO 32)", categoria: "Tecidos (ELEGANCE)", precoMedioMin: 118.79, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LION (01 AO 07)", categoria: "Tecidos (MONTREAL)", precoMedioMin: 62.73, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "LIVERPOOL (01 AO 09)", categoria: "Tecidos (MONTREAL)", precoMedioMin: 81.48, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MANCHESTER (01 AO 08)", categoria: "Tecidos (MONTREAL)", precoMedioMin: 86.35, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MARSELHA (01 AO 08)", categoria: "Tecidos (MONTREAL)", precoMedioMin: 66.30, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "BILBAO (01 AO 07)", categoria: "Tecidos (GRANADA)", precoMedioMin: 50.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "CORDOBA (01 AO 09)", categoria: "Tecidos (GRANADA)", precoMedioMin: 55.78, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "MALAGA (01 AO 07)", categoria: "Tecidos (GRANADA)", precoMedioMin: 56.40, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "SEGOVIA (01 AO 07)", categoria: "Tecidos (GRANADA)", precoMedioMin: 52.04, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "ANIMALS (01 AO 05)", categoria: "Tecidos (PELÚCIA)", precoMedioMin: 72.75, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "FELTRO (003, 34, 35, 38, 42, 65, 72 E 80)", categoria: "Tecidos (FELTRO)", precoMedioMin: 18.70, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "DIAMANTE (01 AO 13)", categoria: "Tecidos (PELÚCIA)", precoMedioMin: 58.96, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "VISON (01 AO 06)", categoria: "Tecidos (PELÚCIA)", precoMedioMin: 96.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "TMB (01 AO 04)", categoria: "Tecidos (VELUDO)", precoMedioMin: 64.80, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "DETROIT (10, 21 E 50)", categoria: "Tecidos (DETORIT)", precoMedioMin: 19.90, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] },
            { nome: "REGAL (11, 12, 25, 31, 51, 74 E 75)", categoria: "Tecidos (REGAL)", precoMedioMin: 20.56, precoMedioMax: null, unidadeMedida: "m", areasDeAtuacao: ["Tapeçaria"] }
        ];

        await CatalogoMercado.insertMany(catalogoMercadoData);
        console.log('Catálogo de Mercado (Tapeçaria) populado com sucesso!');
    } catch (error) {
        console.error('Erro ao popular o Catálogo de Mercado (Tapeçaria):', error);
    }
};

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Servidor Faz&Resolve a correr na porta ${PORT}`);
        });

        // Popula o catálogo após o servidor iniciar, para não bloquear a porta.
        await seedCatalogoMercado();

    } catch (error) {
        console.error("Falha ao iniciar o servidor:", error);
        process.exit(1);
    }
};

startServer();
