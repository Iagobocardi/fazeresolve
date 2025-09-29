// Em: src/controllers/mercadoPago.controller.js (Lógica v1.1)

const { MercadoPagoConfig, PreApproval, Payment } = require('mercadopago');
const mercadoPagoConfig = require('../config/mercadoPago.config.js');
const Assinatura = require('../models/subscription.model.js');
const Usuario = require('../models/usuario.model.js');

// Configuração do cliente do Mercado Pago
const client = new MercadoPagoConfig({ accessToken: mercadoPagoConfig.accessToken });

/**
 * Manipula os webhooks recebidos do Mercado Pago.
 * Esta é a peça central da gestão de pagamentos assíncrona.
 */
const handleWebhook = async (req, res) => {
    const notification = req.body;
    console.log(`[Webhook v1.1] Notificação recebida: ${notification.type} | ID: ${notification.data?.id}`);

    try {
        // O webhook do MP para assinaturas notifica sobre o evento de pagamento.
        if (notification?.type === 'payment' && notification.data?.id) {
            const paymentClient = new Payment(client);
            const paymentDetails = await paymentClient.get({ id: notification.data.id });

            // Ignora pagamentos que não pertencem a uma assinatura
            if (!paymentDetails || !paymentDetails.preapproval_id) {
                console.warn(`[Webhook v1.1] Pagamento ${notification.data.id} não encontrado ou não pertence a uma assinatura.`);
                return res.status(200).send('ok');
            }

            const gatewaySubscriptionId = paymentDetails.preapproval_id;
            const assinatura = await Assinatura.findOne({ gatewaySubscriptionId });

            if (!assinatura) {
                console.error(`[Webhook v1.1] Assinatura com ID de gateway ${gatewaySubscriptionId} não encontrada no DB.`);
                return res.status(200).send('ok'); // Retorna 200 para não reenviar
            }

            const usuario = await Usuario.findById(assinatura.userId);
            if (!usuario) {
                console.error(`[Webhook v1.1] Usuário com ID ${assinatura.userId} da assinatura ${assinatura._id} não encontrado.`);
                return res.status(200).send('ok');
            }

            // Cenário 1: Pagamento APROVADO
            if (paymentDetails.status === 'approved') {
                console.log(`[Webhook v1.1] Pagamento aprovado para assinatura ${assinatura._id}.`);

                assinatura.status = 'ativa';
                assinatura.carenciaExpiraEm = null; // Limpa o período de carência

                // Busca os detalhes da assinatura para atualizar a próxima data de cobrança
                const preApprovalClient = new PreApproval(client);
                const subDetails = await preApprovalClient.get({ id: gatewaySubscriptionId });
                assinatura.dataProximaCobranca = subDetails.next_payment_date;
                await assinatura.save();

                usuario.status = 'ativo';
                await usuario.save();

                console.log(`[Webhook v1.1] Assinatura ${assinatura._id} e Usuário ${usuario._id} atualizados para 'ativo'.`);
                // TODO: Disparar e-mail de confirmação de pagamento.
            }
            // Cenário 2: Pagamento RECUSADO (inicia o período de carência)
            else if (paymentDetails.status === 'rejected' && assinatura.status !== 'pagamento_pendente') {
                console.log(`[Webhook v1.1] Pagamento recusado para assinatura ${assinatura._id}. Iniciando período de carência.`);

                const carenciaDias = 7;
                const dataExpiracao = new Date();
                dataExpiracao.setDate(dataExpiracao.getDate() + carenciaDias);

                assinatura.status = 'pagamento_pendente';
                assinatura.carenciaExpiraEm = dataExpiracao;
                await assinatura.save();

                usuario.status = 'ativo_em_carencia';
                await usuario.save();

                console.log(`[Webhook v1.1] Assinatura ${assinatura._id} -> 'pagamento_pendente'. Usuário ${usuario._id} -> 'ativo_em_carencia'. Carência expira em: ${dataExpiracao.toISOString()}`);

                // TODO: Disparar E-mail 1: "Ops, não conseguimos processar seu pagamento".
            }
        }
        // Lidar com cancelamentos diretos (ex: no painel do MP)
        else if (notification?.type === 'preapproval') {
             const preApprovalClient = new PreApproval(client);
             const subDetails = await preApprovalClient.get({ id: notification.data.id });

             if (subDetails.status === 'cancelled' && subDetails.id) {
                 const assinatura = await Assinatura.findOne({ gatewaySubscriptionId: subDetails.id });
                 if (assinatura && assinatura.status !== 'cancelada') {
                     assinatura.status = 'cancelada';
                     await assinatura.save();
                     const usuario = await Usuario.findById(assinatura.userId);
                     if (usuario) {
                         usuario.status = 'inativo';
                         await usuario.save();
                         console.log(`[Webhook v1.1] Assinatura ${assinatura._id} e usuário ${usuario._id} foram cancelados via notificação de 'preapproval'.`);
                     }
                 }
             }
        }

        // Responde 200 OK para o Mercado Pago não reenviar a notificação.
        res.status(200).send('ok');

    } catch (error) {
        console.error('Erro ao processar webhook do Mercado Pago (v1.1):', error);
        // Retorna 500 para que o MP tente reenviar, mas cuidado com loops de erro.
        res.status(500).send('Erro ao processar webhook.');
    }
};

module.exports = {
    handleWebhook,
};
