const cron = require('node-cron');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const mercadoPagoConfig = require('../config/mercadoPago.config.js');
const Assinatura = require('../models/subscription.model.js');
const Usuario = require('../models/usuario.model.js');

// Configuração do cliente do Mercado Pago
const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });
const paymentClient = new Payment(client);

/**
 * Verifica proativamente o status de pagamentos que ficaram pendentes.
 * Esta é uma salvaguarda contra webhooks perdidos.
 */
const checkPendingPayments = async () => {
    console.log('[CRON] Executando tarefa de verificação de pagamentos pendentes...');

    try {
        const pendingSubscriptions = await Assinatura.find({
            status: 'pagamento_pendente',
            lastPaymentAttemptId: { $ne: null }
        });

        if (pendingSubscriptions.length === 0) {
            console.log('[CRON] Nenhum pagamento pendente para verificar.');
            return;
        }

        console.log(`[CRON] Encontradas ${pendingSubscriptions.length} assinaturas com pagamentos pendentes.`);

        for (const sub of pendingSubscriptions) {
            try {
                const paymentDetails = await paymentClient.get({ id: sub.lastPaymentAttemptId });

                if (paymentDetails.status === 'approved') {
                    console.log(`[CRON] Pagamento ${paymentDetails.id} para a assinatura ${sub._id} foi APROVADO. Atualizando status.`);
                    
                    sub.status = 'ativa';
                    sub.lastPaymentAttemptId = null; // Limpa o ID do pagamento
                    sub.carenciaExpiraEm = null;
                    await sub.save();

                    const usuario = await Usuario.findById(sub.userId);
                    if (usuario) {
                        usuario.status = 'ativo';
                        await usuario.save();
                    }
                } else if (['rejected', 'cancelled', 'refunded'].includes(paymentDetails.status)) {
                    console.log(`[CRON] Pagamento ${paymentDetails.id} para a assinatura ${sub._id} foi ${paymentDetails.status}. Cancelando assinatura.`);
                    
                    sub.status = 'cancelada'; // Ou outro status apropriado
                    sub.lastPaymentAttemptId = null;
                    await sub.save();

                    const usuario = await Usuario.findById(sub.userId);
                    if (usuario) {
                        usuario.status = 'inativo';
                        await usuario.save();
                    }
                }
                // Se ainda estiver pendente, não faz nada e espera a próxima verificação.
                
            } catch (paymentError) {
                console.error(`[CRON] Erro ao verificar o pagamento ${sub.lastPaymentAttemptId} para a assinatura ${sub._id}:`, paymentError.message);
            }
        }

    } catch (error) {
        console.error('[CRON] Erro geral na tarefa de verificação de pagamentos pendentes:', error);
    }
};

// Agenda a tarefa para rodar a cada 6 horas.
// A expressão '0 */6 * * *' significa: no minuto 0, a cada 6 horas, todos os dias.
const task = cron.schedule('0 */6 * * *', checkPendingPayments, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
});

console.log('[CRON] Tarefa de verificação de pagamentos pendentes configurada para rodar a cada 6 horas.');

module.exports = task;
