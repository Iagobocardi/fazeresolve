// src/controllers/configuracao.controller.js
// MUDANÇA: O controller agora gerencia as configurações por 'Conta'.
const Conta = require('../models/conta.model');
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.API_URL}/configuracoes/google/callback`
);

// MUDANÇA: A função agora busca a configuração da CONTA do usuário logado.
exports.getConfiguracao = async (req, res) => {
    try {
        const { contaId } = req.user;
        const conta = await Conta.findById(contaId);

        if (!conta) {
            return res.status(404).json({ message: "Conta não encontrada." });
        }

        const config = conta.toObject();
        config.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

        res.status(200).json(config);
    } catch (error) {
        console.error("Erro ao obter a configuração da conta:", error);
        res.status(500).json({ message: "Ocorreu um erro ao buscar as configurações." });
    }
};

// MUDANÇA: A função agora atualiza a CONTA do usuário logado.
exports.updateConfiguracao = async (req, res) => {
    try {
        const { contaId } = req.user;
        const configAtualizada = await Conta.findByIdAndUpdate(contaId, req.body, {
            new: true,
            runValidators: true,
        });

        if (!configAtualizada) {
            return res.status(404).json({ message: "Conta não encontrada para atualizar." });
        }
        res.status(200).json(configAtualizada);
    } catch (error) {
        console.error("Erro ao atualizar a configuração da conta:", error);
        res.status(500).json({ message: "Ocorreu um erro ao guardar as configurações." });
    }
};

// MUDANÇA: A função de conexão agora passa o `contaId` no estado.
exports.connectGoogleCalendar = (req, res) => {
    const { contaId } = req.user;
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email'
    ];
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: contaId // Passa o ID da conta para o callback
    });
    res.redirect(url);
};

// MUDANÇA: O callback agora usa o `contaId` do estado para atualizar a conta correta.
exports.handleGoogleCallback = async (req, res) => {
    try {
        const { code, state: contaId } = req.query; // Pega o contaId do 'state'

        if (!contaId) {
            throw new Error("ID da conta não encontrado no callback do Google.");
        }

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();

        // Atualiza o documento da CONTA específica com os tokens e o estado
        await Conta.findByIdAndUpdate(contaId, {
            googleCalendarConnected: true,
            googleCalendarEmail: data.email,
            googleTokens: tokens
        });
        
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=success`);

    } catch (error) {
        console.error('Erro no callback do Google:', error.message);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=error`);
    }
};

// MUDANÇA: A desconexão agora limpa os dados da CONTA específica.
exports.disconnectGoogleCalendar = async (req, res) => {
    try {
        const { contaId } = req.user;
        await Conta.findByIdAndUpdate(contaId, {
            googleCalendarConnected: false,
            googleCalendarEmail: '',
            googleTokens: {} // Limpa os tokens
        });
        res.status(200).json({ message: 'Google Calendar desconectado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao desconectar o Google Calendar.' });
    }
};
