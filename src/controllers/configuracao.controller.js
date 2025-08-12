// src/controllers/configuracao.controller.js

const Configuracao = require('../models/configuracao.model.js');
const { google } = require('googleapis');

// 2. Defina o cliente OAuth2 AQUI, no topo do ficheiro
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.API_URL || 'http://localhost:3000/api'}/configuracoes/google/callback`
);

// Função para obter a configuração atual (ou criar uma se não existir)
exports.getConfiguracao = async (req, res) => {
    try {
        const configFromDb = await Configuracao.obterConfiguracao();

        // Converte para um objeto simples para podermos adicionar propriedades
        const config = configFromDb.toObject ? configFromDb.toObject() : {};

        // Adiciona a chave da API do Google Maps do ambiente
        config.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

        res.status(200).json(config);
    } catch (error) {
        console.error("Erro ao obter a configuração:", error);
        res.status(500).json({ message: "Ocorreu um erro ao buscar as configurações." });
    }
};

// Função para atualizar a configuração
exports.updateConfiguracao = async (req, res) => {
    try {
        // Usamos findOneAndUpdate com a opção { new: true, upsert: true }
        // `upsert: true` garante que se não houver um documento de configuração, ele será criado.
        // `new: true` garante que a resposta devolva o documento atualizado.
        const configAtualizada = await Configuracao.findOneAndUpdate({}, req.body, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        res.status(200).json(configAtualizada);
    } catch (error) {
        console.error("Erro ao atualizar a configuração:", error);
        res.status(500).json({ message: "Ocorreu um erro ao guardar as configurações." });
    }
};
// --- NOVAS FUNÇÕES PARA A INTEGRAÇÃO ---

// Inicia o processo de conexão com o Google
exports.connectGoogleCalendar = (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/userinfo.email'
    ];
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Força o ecrã de consentimento
    });
    res.redirect(url);
};

// Recebe o callback da Google após o consentimento
exports.handleGoogleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Busca o email da conta conectada para mostrar na UI
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();

        // Atualiza o documento de configuração com os tokens e o estado
        await Configuracao.findOneAndUpdate({}, {
            googleCalendarConnected: true,
            googleCalendarEmail: data.email,
            googleTokens: tokens
        }, { upsert: true });
        
        // Redireciona de volta para a página de configurações com uma mensagem de sucesso
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=success`);

    } catch (error) {
        console.error('Erro no callback do Google:', error.message);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/configuracoes?google_auth=error`);
    }
};

// Desconecta a conta do Google Calendar
exports.disconnectGoogleCalendar = async (req, res) => {
    try {
        await Configuracao.findOneAndUpdate({}, {
            googleCalendarConnected: false,
            googleCalendarEmail: '',
            googleTokens: {} // Limpa os tokens
        });
        res.status(200).json({ message: 'Google Calendar desconectado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao desconectar o Google Calendar.' });
    }
};