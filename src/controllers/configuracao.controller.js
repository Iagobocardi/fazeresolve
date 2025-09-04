// src/controllers/configuracao.controller.js

const Configuracao = require('../models/configuracao.model.js');
const Conta = require('../models/conta.model.js');
const { google } = require('googleapis');

// Defina o cliente OAuth2 AQUI, no topo do ficheiro
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.API_URL}/configuracoes/google/callback`
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
        const conta = await Conta.findById(contaId).select('googleCalendarConnected').lean();

        const configObject = config.toObject();
        configObject.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
        // Adiciona a informação de conexão ao objeto de resposta
        configObject.googleCalendarConnected = conta ? conta.googleCalendarConnected : false;

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
        state: state
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

        const { contaId } = JSON.parse(state);
        if (!contaId) {
            console.error('[Google Callback] Erro: contaId não encontrado no parâmetro state.');
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=error_no_state`);
        }
        console.log(`[Google Callback] A atualizar a conta: ${contaId}`);

        await Conta.findByIdAndUpdate(contaId, {
            googleCalendarConnected: true,
            googleTokens: tokens
        });
        console.log(`[Google Callback] Conta ${contaId} atualizada com sucesso.`);
        
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
            googleTokens: {} // Limpa os tokens
        });
        res.status(200).json({ message: 'Google Calendar desconectado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao desconectar o Google Calendar.' });
    }
};
