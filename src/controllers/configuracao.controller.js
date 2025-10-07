// src/controllers/configuracao.controller.js

const { google } = require('googleapis');
const axios = require('axios');
const Configuracao = require('../models/configuracao.model.js');
const Conta = require('../models/conta.model.js');
const Subscription = require('../models/subscription.model.js');
const Transacao = require('../models/transacao.model.js');
const subscriptionService = require('../services/subscription.service.js');
const PLANS = require('../config/plans.config.js');


// Defina o cliente OAuth2 AQUI, no topo do ficheiro
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.API_URL}/configuracoes/google/callback` // /api embutido removido
);
// Função para obter a configuração da conta do usuário
exports.getConfiguracao = async (req, res) => {
    try {
        const { contaId } = req.user; // O middleware de autenticação nos dá o usuário

        let config = await Configuracao.findOne({ contaId });

        // Se não existir configuração para esta conta, cria uma nova
        if (!config) {
            config = await Configuracao.create({ contaId });
        }
        
        // Busca a informação de conexão do Google na conta separadamente
        const conta = await Conta.findById(contaId).select('googleCalendarConnected googleAccountEmail').lean();

        const configObject = config.toObject();
        configObject.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

        // Adiciona a informação de conexão ao objeto de resposta
        configObject.googleCalendarConnected = conta ? conta.googleCalendarConnected : false;
        configObject.googleAccountEmail = conta ? conta.googleAccountEmail : null;

        res.status(200).json(configObject);
    } catch (error) {
        console.error("Erro ao obter a configuração:", error);
        res.status(500).json({ message: "Ocorreu um erro ao buscar as configurações." });
    }
};

// Função para atualizar a configuração da conta do usuário
exports.updateConfiguracao = async (req, res) => {
    try {
        const { contaId } = req.user;
        const configAtualizada = await Configuracao.findOneAndUpdate(
            { contaId }, 
            req.body, 
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        );
        res.status(200).json(configAtualizada);
    } catch (error) {
        console.error("Erro ao atualizar a configuração:", error);
        res.status(500).json({ message: "Ocorreu um erro ao guardar as configurações." });
    }
};

// Inicia o processo de conexão com o Google
exports.connectGoogleCalendar = (req, res) => {
    if (!req.user || !req.user.contaId) {
        return res.status(400).send('Erro: O seu utilizador não está associado a uma conta de empresa. Não é possível conectar ao Google Calendar.');
    }
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email'
    ];
    const state = JSON.stringify({ contaId: req.user.contaId });
   const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: state,
    redirect_uri: oauth2Client.redirectUri // Adicione esta linha
});
    res.redirect(url);
};

// Recebe o callback da Google após o consentimento
exports.handleGoogleCallback = async (req, res) => {
    console.log('[Google Callback] Recebido callback da Google.');
    try {
        const { code, state } = req.query;
        if (!code) {
            console.error('[Google Callback] Erro: Código de autorização não recebido.');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=error_no_code`);
        }
        console.log('[Google Callback] Código recebido. A trocar por tokens...');

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        console.log('[Google Callback] Tokens recebidos com sucesso.');

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: userInfo } = await oauth2.userinfo.get();
        const email = userInfo.email;
        console.log(`[Google Callback] Email do usuário obtido: ${email}`);

        const { contaId } = JSON.parse(state);
        if (!contaId) {
            console.error('[Google Callback] Erro: contaId não encontrado no parâmetro state.');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=error_no_state`);
        }
        console.log(`[Google Callback] A atualizar a conta: ${contaId}`);

        await Conta.findByIdAndUpdate(contaId, {
            googleCalendarConnected: true,
            googleTokens: tokens,
            googleAccountEmail: email
        });
        console.log(`[Google Callback] Conta ${contaId} atualizada com sucesso com o email ${email}.`);
        
        console.log('[Google Callback] A redirecionar para o frontend...');
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=success`);

    } catch (error) {
        console.error('[Google Callback] ERRO CRÍTICO no processamento do callback:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=error_critical`);
    }
};

// Desconecta a conta do Google Calendar
exports.disconnectGoogleCalendar = async (req, res) => {
    try {
        const { contaId } = req.user;
        await Conta.findByIdAndUpdate(contaId, {
            googleCalendarConnected: false,
            googleTokens: {}, // Limpa os tokens
            googleAccountEmail: null // Limpa o email
        });
        res.status(200).json({ message: 'Google Calendar desconectado com sucesso.' });
    } catch (error) {
        console.error("Erro ao desconectar o Google Calendar:", error);
        res.status(500).json({ message: 'Erro ao desconectar o Google Calendar.' });
    }
};

// Inicia o processo de onboarding do WhatsApp com a Twilio
exports.iniciarWhatsappOnboarding = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { numero, nomeExibicao, twilioAccountSid, twilioAuthToken } = req.body;

        if (!numero || !nomeExibicao || !twilioAccountSid || !twilioAuthToken) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios: número, nome de exibição e credenciais da Twilio.' });
        }
        
        const conta = await Conta.findById(contaId);
        if (!conta) {
            return res.status(404).json({ message: "Conta não encontrada. Não é possível iniciar o onboarding." });
        }

        // Salva as credenciais da Twilio na conta ANTES de chamar a API
        conta.twilioAccountSid = twilioAccountSid;
        conta.twilioAuthToken = twilioAuthToken;
        conta.whatsappSender = numero;
        await conta.save();

        const twilioUrl = 'https://messaging.twilio.com/v2/Channels/Senders';
        const basicAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

        const requestBody = {
            sender_id: `whatsapp:${numero}`,
            profile: { name: nomeExibicao },
            webhook: {
                callback_url: `${process.env.API_URL}/api/whatsapp/webhook`,
                callback_method: 'POST'
            }
        };

        const response = await axios.post(twilioUrl, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`
            }
        });

        // Salva o SID do Sender retornado pela Twilio
        conta.whatsappSenderSid = response.data.sid;
        await conta.save();

        res.status(200).json({ 
            message: 'Processo de registo do número iniciado. Um código de verificação foi enviado para o seu número via WhatsApp.',
            senderSid: response.data.sid 
        });

    } catch (error) {
        console.error("Erro ao iniciar onboarding do WhatsApp:", error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || 'Erro ao iniciar o processo de onboarding do WhatsApp.';
        const errorCode = error.response?.status || 500;
        res.status(errorCode).json({ message: errorMessage });
    }
};

// Função para atualizar os dados do perfil da empresa
exports.updatePerfil = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { nomeEmpresa, cnpjCpf, telefone, endereco } = req.body;

        // Montar o objeto de atualização
        const updateData = {
            nome: nomeEmpresa,
            'companyInfo.cnpj': cnpjCpf,
            'companyInfo.telefone': telefone,
            'companyInfo.endereco': endereco,
        };

        const contaAtualizada = await Conta.findByIdAndUpdate(
            contaId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!contaAtualizada) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }

        res.status(200).json({ message: 'Perfil atualizado com sucesso.', data: contaAtualizada });

    } catch (error) {
        console.error("Erro em updatePerfil:", error);
        res.status(500).json({ message: "Erro ao atualizar o perfil." });
    }
};

// Função para alterar o plano do usuário
exports.alterarPlano = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { novoPlano } = req.body; // ex: 'Premium'

        if (!novoPlano) {
            return res.status(400).json({ message: 'O nome do novo plano é obrigatório.' });
        }

        // A lógica de upgrade/downgrade é complexa e já está (ou deveria estar) no subscriptionService
        const resultado = await subscriptionService.upgradeSubscription(contaId, novoPlano);

        res.status(200).json({ message: `Plano alterado para ${novoPlano} com sucesso!`, data: resultado });

    } catch (error) {
        console.error("Erro em alterarPlano:", error);
        res.status(500).json({ message: error.message || "Erro ao alterar o plano." });
    }
};

// Função para cancelar a assinatura do usuário
exports.cancelarAssinatura = async (req, res) => {
    try {
        const { contaId } = req.user;

        const resultado = await subscriptionService.cancelSubscription(contaId);

        res.status(200).json({ message: 'Assinatura cancelada com sucesso.', data: resultado });

    } catch (error) {
        console.error("Erro em cancelarAssinatura:", error);
        res.status(500).json({ message: error.message || "Erro ao cancelar a assinatura." });
    }
};

// Função para atualizar o método de pagamento
exports.atualizarMetodoPagamento = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { cardTokenId } = req.body; // O frontend deve gerar este token

        if (!cardTokenId) {
            return res.status(400).json({ message: 'O token do cartão é obrigatório.' });
        }

        // Precisamos encontrar o ID da assinatura no gateway
        const conta = await Conta.findById(contaId).select('mercadoPagoSubscriptionId').lean();
        if (!conta || !conta.mercadoPagoSubscriptionId) {
            return res.status(404).json({ message: 'Nenhuma assinatura ativa encontrada para atualizar.' });
        }

        const resultado = await subscriptionService.updateSubscriptionCard(conta.mercadoPagoSubscriptionId, cardTokenId);

        res.status(200).json({ message: 'Método de pagamento atualizado com sucesso.', data: resultado });

    } catch (error) {
        console.error("Erro em atualizarMetodoPagamento:", error);
        res.status(500).json({ message: error.message || "Erro ao atualizar o método de pagamento." });
    }
};

// Função para atualizar as configurações de recebimento
exports.updateRecebimentos = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { metodo, chavePix } = req.body;

        if (!metodo || !['MANUAL', 'MERCADOPAGO'].includes(metodo)) {
            return res.status(400).json({ message: 'Método de recebimento inválido.' });
        }

        const updateData = {
            metodoRecebimento: metodo,
            chavePixManual: metodo === 'MANUAL' ? chavePix : null,
        };

        const contaAtualizada = await Conta.findByIdAndUpdate(
            contaId,
            { $set: updateData },
            { new: true }
        );

        if (!contaAtualizada) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }

        res.status(200).json({ message: 'Configurações de recebimento atualizadas com sucesso.', data: contaAtualizada });

    } catch (error) {
        console.error("Erro em updateRecebimentos:", error);
        res.status(500).json({ message: "Erro ao atualizar as configurações de recebimento." });
    }
};

// Função unificada para obter todos os dados da página de configurações
exports.getAllData = async (req, res) => {
    try {
        const { contaId } = req.user;

        // 1. Obter dados do Perfil e Integrações (a partir do modelo Conta)
        const contaPromise = Conta.findById(contaId)
            .select('nome companyInfo metodoRecebimento chavePixManual googleCalendarConnected googleAccountEmail isWhatsappConnected focusNFeConnected plano statusAssinatura')
            .lean();

        // 2. Obter dados da Assinatura
        const subscriptionDetailsPromise = subscriptionService.getSubscriptionDetails(contaId).catch(err => {
            console.warn(`Aviso: Não foi possível obter detalhes da assinatura para a conta ${contaId}. Erro: ${err.message}`);
            return null; // Retorna nulo se houver erro, para não quebrar a Promise.all
        });

        // 3. Obter Histórico de Faturas (últimas 5)
        const faturasPromise = Transacao.find({ contaId, tipo: 'FATURA_ASSINATURA' })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('createdAt valor status linkBoleto')
            .lean();

        // 4. Obter todos os planos disponíveis para o modal de alteração
        const planosDisponiveisPromise = Promise.resolve(PLANS);

        // Executar todas as promessas em paralelo
        const [conta, subscriptionDetails, faturas, planosDisponiveis] = await Promise.all([
            contaPromise,
            subscriptionDetailsPromise,
            faturasPromise,
            planosDisponiveisPromise
        ]);

        if (!conta) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }

        // Montar o objeto de resposta final
        const response = {
            perfil: {
                nomeEmpresa: conta.nome,
                cnpjCpf: conta.companyInfo?.cnpj,
                telefone: conta.companyInfo?.telefone, // Supondo que o telefone esteja em companyInfo
                endereco: conta.companyInfo?.endereco
            },
            assinatura: {
                planoAtual: conta.plano,
                status: conta.statusAssinatura,
                proximaCobranca: subscriptionDetails?.proximaCobranca,
                metodoPagamento: subscriptionDetails?.metodoPagamento, // Ex: { brand: 'visa', last4: '4242' }
                faturas: faturas,
                planosDisponiveis: planosDisponiveis.map(p => ({
                    nome: p.name,
                    precoMensal: p.monthly.price,
                    precoAnual: p.annual.price,
                }))
            },
            recebimentos: {
                metodo: conta.metodoRecebimento,
                chavePix: conta.chavePixManual
            },
            integracoes: {
                whatsapp: { conectado: conta.isWhatsappConnected },
                google: { conectado: conta.googleCalendarConnected, email: conta.googleAccountEmail },
                focusNFe: { conectado: conta.focusNFeConnected },
                mercadoPago: { conectado: conta.metodoRecebimento === 'MERCADOPAGO' }
            }
        };

        res.status(200).json(response);

    } catch (error) {
        console.error("Erro em getAllData:", error);
        res.status(500).json({ message: "Erro ao buscar os dados de configuração." });
    }
};

// Verifica o código de verificação do número de WhatsApp
exports.verificarWhatsappSender = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { verificationCode } = req.body;

        if (!verificationCode) {
            return res.status(400).json({ message: 'O código de verificação é obrigatório.' });
        }

        const conta = await Conta.findById(contaId);
        if (!conta || !conta.twilioAccountSid || !conta.whatsappSenderSid) {
            return res.status(404).json({ message: 'Configuração da Twilio não encontrada ou processo de onboarding não iniciado para esta conta.' });
        }

        const twilioUrl = `https://messaging.twilio.com/v2/Channels/Senders/${conta.whatsappSenderSid}`;
        const basicAuth = Buffer.from(`${conta.twilioAccountSid}:${conta.twilioAuthToken}`).toString('base64');

        const requestBody = {
            configuration: {
                verification_code: verificationCode
            }
        };

        // Note: A API da Twilio para verificar o sender é um POST no mesmo endpoint de criação
        await axios.post(twilioUrl, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`
            }
        });

        res.status(200).json({ message: 'Número verificado com sucesso! A sua automação de WhatsApp está pronta para ser ativada.' });

    } catch (error) {
        console.error("Erro ao verificar o sender do WhatsApp:", error.response ? error.response.data : error.message);
        const errorMessage = error.response?.data?.message || 'Erro ao verificar o código.';
        const errorCode = error.response?.status || 500;
        res.status(errorCode).json({ message: errorMessage });
    }
};
