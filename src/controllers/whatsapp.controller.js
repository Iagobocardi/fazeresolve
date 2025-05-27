// Arquivo: src/controllers/whatsapp.controller.js

// REMOVA ESTA LINHA (ou a linha que está causando o erro, provavelmente a primeira importação de express-validator)
// const  body} = require('express-validator'); // LINHA INCORRETA E DUPLICADA

const whatsappService = require('../services/whatsapp.service');
const { validationResult, body } = require('express-validator'); // MANTENHA APENAS ESTA LINHA PARA IMPORTAR validationResult e body

const whatsappMessageValidationRules = [
    body('From').notEmpty().isString().trim().withMessage('Número de telefone (From) é obrigatório'),
    body('Body').notEmpty().isString().trim().withMessage('Mensagem (Body) é obrigatória'),
    // Adicione outras validações se necessário
];

const receiveMessage = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const messageData = {
            from: req.body.From,
            text: {
                body: req.body.Body
            },
            // Adicione outros campos que você espera, como WaId: req.body.WaId
        };
        console.log('Mensagem recebida do WhatsApp (Twilio):', messageData);

        const clienteInfo = await whatsappService.extractClientInfo(messageData);

        if (clienteInfo && clienteInfo.telefone) {
            const novoCliente = await whatsappService.handleClientCadastro(clienteInfo);
            await whatsappService.sendWhatsAppMessage(
                messageData.from,
                `Olá, ${novoCliente.nome || 'Cliente'}, seu cadastro foi realizado com sucesso!`
            );
            res.status(200).json({ message: 'Mensagem processada e cliente cadastrado/atualizado com sucesso!', cliente: novoCliente });
        } else if (clienteInfo) {
            const novoCliente = await whatsappService.handleClientCadastro(clienteInfo);
            await whatsappService.sendWhatsAppMessage(
                messageData.from,
                `Olá, identificamos seu número de telefone, mas precisamos do seu nome para completar o cadastro. Por favor, nos informe!`
            );
            res.status(200).json({ message: 'Mensagem processada, telefone identificado, solicitando nome', cliente: novoCliente });
        } else {
            res.status(200).json({ message: 'Mensagem recebida, mas não foi possível extrair informações do cliente.' });
        }
    } catch (error) {
        console.error('Erro ao receber mensagem do WhatsApp (Twilio):', error);
        res.status(500).json({ error: 'Erro ao processar mensagem do WhatsApp.', details: error.message });
    }
};

module.exports = {
    whatsappMessageValidationRules,
    receiveMessage
};