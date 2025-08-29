const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const mercadoPagoConfig = require('../config/mercadoPago.config.js');
const Subscription = require('../models/subscription.model.js');
const Conta = require('../models/conta.model.js');
const Usuario = require('../models/usuario.model.js');
const mercadoPagoService = require('../services/mercadoPago.service.js');

const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });

const handleWebhook = async (req, res) => {
    const notification = req.body;
    console.log('[Webhook] Notificação recebida:', JSON.stringify(notification, null, 2));

    try {
        if (notification?.type === 'preapproval') {
            const preApproval = new PreApproval(client);
            const subscriptionData = await preApproval.get({ id: notification.data.id });

            const localSubscription = await Subscription.findOne({ subscriptionId: subscriptionData.id });

            if (localSubscription) {
                // Atualiza o modelo de Assinatura local
                localSubscription.status = subscriptionData.status;
                localSubscription.nextPaymentDate = subscriptionData.next_payment_date;
                if (subscriptionData.status === 'authorized') {
                    localSubscription.lastPaymentDate = new Date();
                }
                await localSubscription.save();

                // Lógica de negócio para atualizar a Conta principal
                const user = await Usuario.findById(localSubscription.userId);
                if (user) {
                    const conta = await Conta.findById(user.contaId);
                    if (conta) {
                        switch (subscriptionData.status) {
                            case 'paused':
                                conta.statusAssinatura = 'EM_ATRASO';
                                conta.gracePeriodExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
                                console.log(`[Webhook] Conta ${conta._id} entrou em período de carência.`);
                                break;
                            case 'authorized':
                                conta.statusAssinatura = 'ATIVO';
                                conta.gracePeriodExpiresAt = null;
                                console.log(`[Webhook] Conta ${conta._id} reativada com sucesso.`);
                                break;
                            case 'cancelled':
                                conta.statusAssinatura = 'INATIVO';
                                conta.gracePeriodExpiresAt = null;
                                console.log(`[Webhook] Conta ${conta._id} foi cancelada/inativada.`);
                                break;
                        }
                        await conta.save();
                    }
                }
            }
        } else if (notification?.type === 'payment' && notification.data?.id) {
            // Delega a lógica para o novo serviço
            await mercadoPagoService.handlePaymentNotification(notification.data.id);
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
