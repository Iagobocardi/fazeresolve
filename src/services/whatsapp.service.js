// Arquivo: src/services/whatsapp.service.js
// Versão com o commandParser temporariamente desativado para depuração.

const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
// const commandParser = require('./commandParser.js'); // <-- TEMPORARIAMENTE DESATIVADO
const chrono = require('chrono-node');
const axios = require('axios');
const Conversa = require('../models/conversa.model');

// 1. Cliente Twilio e número de telefone definidos UMA VEZ no topo.
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioPhoneNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

// =======================================================
// FUNÇÃO 1: Enviar mensagens de texto ou com mídia
// =======================================================
const sendWhatsAppMessage = async (phoneNumber, message = '', mediaUrls = []) => {
    if (!phoneNumber) {
        console.error("[SERVICE] ERRO: Tentativa de enviar mensagem para um número indefinido.");
        return;
    }
    try {
        const messageData = {
            from: twilioPhoneNumber,
            to: `whatsapp:${phoneNumber}`,
            statusCallback: '' 
        };

        if (message && message.trim() !== '') {
            messageData.body = message;
        }
        if (mediaUrls && mediaUrls.length > 0) {
            messageData.mediaUrl = mediaUrls;
        }
        if (!messageData.body && !messageData.mediaUrl) {
            return;
        }
        await twilioClient.messages.create(messageData);
        console.log(`[SERVICE] Mensagem enviada com sucesso para ${phoneNumber}.`);
    } catch (error) {
        console.error("[SERVICE] ERRO AO ENVIAR VIA TWILIO (APÓS CORREÇÃO):", error);
    }
};

// =======================================================
// FUNÇÃO 2: Enviar pesquisa de satisfação (seu código original)
// =======================================================
const sendSatisfactionSurvey = async (clientPhone, orcamentoId) => {
    // ... (seu código existente para sendSatisfactionSurvey)
};

// =======================================================
// FUNÇÃO 3: Checar status de pedidos (seu código original)
// =======================================================
const handleCheckOrderStatus = async (user) => {
    // ... (seu código existente para handleCheckOrderStatus)
};

// =======================================================
// FUNÇÃO 4: Lidar com TODAS as mensagens que chegam do webhook
// =======================================================
const handleIncomingMessage = async (req) => {
    try {
        const { From, ProfileName, Body, NumMedia, ButtonPayload } = req.body;
        if (!From) { return console.log("Requisição ignorada por não conter remetente 'From'."); }

        const senderPhone = From.replace('whatsapp:', '');
        const messageBody = Body || '';
        // ... (resto da sua lógica de extração de dados)

        // ETAPA 1: Processar respostas de botões/listas (seu código original)
        // ... (seu código existente)

        // ETAPA 2: Lógica de conversa normal
        let user = await Cliente.findOne({ telefone: senderPhone });

        if (!user) {
            // ... (sua lógica para criar novo cliente ou identificar prestador)
        }

        if (user.role === 'PRESTADOR') {
            // --- CORREÇÃO APLICADA AQUI ---
            // A lógica que depende do 'commandParser' foi temporariamente comentada.
            console.log(`[SERVICE] MODO PRESTADOR: Comando recebido: "${messageBody}"`);
            await sendWhatsAppMessage(user.telefone, `Comando "${messageBody}" recebido. A lógica do commandParser está temporariamente desativada para depuração.`);
            // const responseMessage = await commandParser.parseAndExecute(messageBody, user, sendWhatsAppMessage);
            // if (responseMessage) { await sendWhatsAppMessage(user.telefone, responseMessage); }

        } else { // Role: 'CLIENTE_FINAL'
            // Lógica para guardar a mensagem na conversa
            if (messageBody || (mediaUrls && mediaUrls.length > 0)) {
                // ... (sua lógica para guardar na conversa)
            }
            // ... (resto da sua lógica de chatbot para o cliente final)
        }
    } catch (error) {
        console.error("[SERVICE] ERRO GERAL NO HANDLEINCOMINGMESSAGE:", error);
    }
};

// =======================================================
// EXPORTANDO AS FUNÇÕES CORRETAMENTE
// =======================================================
module.exports = {
    handleIncomingMessage,
    sendWhatsAppMessage,
    sendSatisfactionSurvey
};
