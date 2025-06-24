// Arquivo: src/controllers/whatsapp.controller.js - VERSÃO ATUALIZADA

const whatsappService = require('../services/whatsapp.service');
const { validationResult, body } = require('express-validator');

// As regras de validação estão ótimas e podem ser mantidas!
const whatsappMessageValidationRules = [
    body('From').notEmpty().withMessage('Número de telefone (From) é obrigatório'),
    body('Body').notEmpty().withMessage('Mensagem (Body) é obrigatória'),
    // ProfileName é enviado pelo Twilio e é útil para pegar o nome do usuário
    body('ProfileName').isString().optional(), 
];

// A função foi renomeada para seguir a convenção de webhook
const handleWhatsAppWebhook = async (req, res) => {
    // 1. Validação da Requisição (mantida, pois é uma boa prática)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Erro de validação no webhook:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // 2. Extração Simplificada dos Dados Essenciais
        // O Twilio envia o número no formato "whatsapp:+5511..."
        const senderPhone = req.body.From.replace('whatsapp:', '');
        const senderName = req.body.ProfileName; // Nome do perfil do usuário no WhatsApp
        const messageBody = req.body.Body;
        
        console.log(`Mensagem de ${senderName} (${senderPhone}): "${messageBody}"`);

        const senderInfo = {
            phone: senderPhone,
            name: senderName
        };

        // 3. ÚNICA CHAMADA PARA O SERVIÇO
        // Toda a lógica de qual mensagem responder, o que salvar no banco, etc.,
        // agora está dentro de 'handleIncomingMessage'. O controller não precisa saber disso.
        await whatsappService.handleIncomingMessage(senderInfo, messageBody);

        // 4. Resposta para o Twilio
        // Apenas informamos ao Twilio que recebemos a mensagem com sucesso.
        // A resposta para o *cliente* no WhatsApp é enviada pelo serviço.
        res.status(200).send('Webhook recebido com sucesso.');

    } catch (error) {
        console.error('Erro crítico no processamento do webhook:', error);
        res.status(500).json({ error: 'Erro interno ao processar a mensagem.' });
    }
};

module.exports = {
    whatsappMessageValidationRules,
    // Exporta a função com o novo nome
    handleWhatsAppWebhook 
};