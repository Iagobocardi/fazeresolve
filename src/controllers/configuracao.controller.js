// src/controllers/configuracao.controller.js

const { google } = require('googleapis');
const axios = require('axios');
const Configuracao = require('../models/configuracao.model.js');
const Conta = require('../models/conta.model.js');

// Defina o cliente OAuth2 AQUI, no topo do ficheiro
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.API_URL}/api/configuracoes/google/callback`
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
