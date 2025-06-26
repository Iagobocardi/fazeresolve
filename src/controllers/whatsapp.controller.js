const whatsappService = require('../services/whatsapp.service');

const handleWhatsAppWebhook = async (req, res) => {
    // Ignora notificações de status que não têm um corpo de mensagem
    if (!req.body.Body) {
        console.log('[CONTROLLER] Notificação de status do Twilio recebida e ignorada.');
        return res.status(200).send('Status update received.');
    }

    console.log('[CONTROLLER] Nova mensagem de utilizador recebida:', req.body);

    try {
        const senderInfo = {
            phone: req.body.From.replace('whatsapp:', ''),
            name: req.body.ProfileName
        };
        const messageBody = req.body.Body;

        await whatsappService.handleIncomingMessage(senderInfo, messageBody);

        // Apenas confirma o recebimento para o Twilio. A resposta ao cliente é enviada pelo serviço.
        res.status(200).send();
    } catch (error) {
        console.error('[CONTROLLER] ERRO CRÍTICO:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    handleWhatsAppWebhook 
};
