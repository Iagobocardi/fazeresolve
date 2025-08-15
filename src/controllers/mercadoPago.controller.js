const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const mercadoPagoConfig = require('../config/mercadoPago.config.js');
const Subscription = require('../models/subscription.model.js');

const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });

const handleWebhook = async (req, res) => {
    const notification = req.body;

    try {
        if (notification?.type === 'preapproval') {
            const preApproval = new PreApproval(client);
            const subscriptionData = await preApproval.get({ id: notification.data.id });

            // Encontra a assinatura no banco de dados local pelo ID do Mercado Pago
            const localSubscription = await Subscription.findOne({ subscriptionId: subscriptionData.id });

            if (localSubscription) {
                localSubscription.status = subscriptionData.status;
                localSubscription.nextPaymentDate = subscriptionData.next_payment_date;
                
                if (subscriptionData.status === 'authorized') {
                    localSubscription.lastPaymentDate = new Date();
                }

                await localSubscription.save();
            }
        }
        
        // É importante responder com 200 OK para o Mercado Pago parar de enviar a notificação.
        res.status(200).send('ok');

    } catch (error) {
        console.error('Erro ao processar webhook do Mercado Pago:', error);
        res.status(500).send('Erro ao processar webhook.');
    }
};

module.exports = {
    handleWebhook,
};
