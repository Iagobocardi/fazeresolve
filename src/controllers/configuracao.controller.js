// src/controllers/configuracao.controller.js

const Configuracao = require('../models/configuracao.model.js');
const Conta = require('../models/conta.model.js');
const { google } = require('googleapis');

// 2. Defina o cliente OAuth2 AQUI, no topo do ficheiro
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
        
        // Converte para um objeto simples para podermos adicionar propriedades
        const configObject = config.toObject();

        // Adiciona a chave da API do Google Maps do ambiente
        configObject.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

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
        // Encontra e atualiza a configuração específica da conta.
        // O `upsert` garante que se não existir, será criada com o contaId correto.
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
// --- NOVAS FUNÇÕES PARA A INTEGRAÇÃO ---

// Inicia o processo de conexão com o Google
exports.connectGoogleCalendar = (req, res) => {
   // Verificação de segurança adicionada
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
        prompt: 'consent', // Força o ecrã de consentimento
        state: state
    });
    res.redirect(url);
};

// Recebe o callback da Google após o consentimento
exports.handleGoogleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // O `state` que definimos no `connect` continha o contaId
        const { contaId } = JSON.parse(req.query.state);

        // **FIX APLICADO**: Atualiza o documento da CONTA, não da configuração
        await Conta.findByIdAndUpdate(contaId, {
            googleCalendarConnected: true,
            googleTokens: tokens
        });
        
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
        const { contaId } = req.user;
        // **FIX APLICADO**: Atualiza o documento da CONTA
        await Conta.findByIdAndUpdate(contaId, {
            googleCalendarConnected: false,
            googleTokens: {} // Limpa os tokens
        });
        res.status(200).json({ message: 'Google Calendar desconectado com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao desconectar o Google Calendar.' });
    }
};
