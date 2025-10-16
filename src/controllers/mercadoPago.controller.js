// Arquivo: src/controllers/mercadoPago.controller.js
const mercadoPagoService = require('../services/mercadoPago.service');

const handleWebhook = async (req, res) => {
    const notification = req.body;

    if (notification.type === 'payment' && notification.data?.id) {
        console.log(`[Webhook] Notificação de pagamento recebida: ${notification.data.id}`);
        try {
            await mercadoPagoService.handlePaymentNotification(notification.data.id);
            res.status(200).send('Webhook processado');
        } catch (error) {
            console.error(`[Webhook] Erro ao processar pagamento ${notification.data.id}:`, error);
            res.status(500).send('Erro ao processar webhook');
        }
    } else {
        // Ignora outros tipos de notificação por enquanto
        res.status(200).send('Notificação ignorada');
    }
};

module.exports = {
    handleWebhook,
};
