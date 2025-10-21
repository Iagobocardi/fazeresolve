const Conta = require('../models/conta.model');
const PLANS = require('../config/plans.config');
const mercadoPagoService = require('../services/mercadoPago.service');

const createOneTimePayment = async (req, res) => {
    try {
        const { contaId, id: userId, email: userEmail, nome: userName } = req.user;
        const { planId, paymentMethod, cardTokenId } = req.body;

        if (!planId || !paymentMethod) {
            return res.status(400).json({ message: 'O ID do plano e o método de pagamento são obrigatórios.' });
        }

        // Find the selected plan details from the config file
        let selectedPlan = null;
        for (const plan of PLANS) {
            const found = plan.oneTime.find(p => p.id === planId);
            if (found) {
                selectedPlan = { ...found, name: plan.name };
                break;
            }
        }

        if (!selectedPlan) {
            return res.status(404).json({ message: 'O plano selecionado não foi encontrado.' });
        }

        const conta = await Conta.findById(contaId).lean();
        if (!conta) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }

        const paymentData = {
            transaction_amount: parseFloat(selectedPlan.price),
            description: `Acesso ${selectedPlan.name} por ${selectedPlan.months} meses`,
            payment_method_id: paymentMethod.toLowerCase() === 'pix' ? 'pix' : 'credit_card',
            payer: {
                email: userEmail,
                first_name: userName,
            },
            external_reference: `${contaId}_${planId}`, // Unique reference for webhook
            notification_url: `${process.env.API_URL}/pagamentos/mercado-pago-webhook`,
        };

        if (paymentMethod.toLowerCase() === 'pix') {
            const pixData = await mercadoPagoService.createPixPayment(paymentData);
            return res.status(201).json({
                message: 'Cobrança PIX criada com sucesso.',
                type: 'pix',
                paymentId: pixData.id,
                qrCode: pixData.point_of_interaction.transaction_data.qr_code,
                qrCodeBase64: pixData.point_of_interaction.transaction_data.qr_code_base64,
            });
        } else if (paymentMethod.toLowerCase() === 'credit_card') {
            if (!cardTokenId) {
                return res.status(400).json({ message: 'O token do cartão é obrigatório para pagamentos com cartão de crédito.' });
            }
            const cardPaymentData = { ...paymentData, token: cardTokenId };
            const paymentResult = await mercadoPagoService.createCardPayment(cardPaymentData);
            
            // O webhook irá lidar com a ativação, mas retornamos um sucesso imediato para o frontend.
            return res.status(201).json({
                message: 'Pagamento com cartão de crédito processado com sucesso.',
                type: 'credit_card',
                paymentId: paymentResult.id,
                status: paymentResult.status,
            });
        } else {
            return res.status(400).json({ message: 'Método de pagamento inválido.' });
        }

    } catch (error) {
        console.error("Erro ao criar pagamento único:", error);
        res.status(500).json({ message: error.message || "Ocorreu um erro ao processar o pagamento." });
    }
};

const handleWebhook = async (req, res) => {
    const { body } = req;

    if (body.type === 'payment') {
        const paymentId = body.data.id;
        console.log(`[Webhook] Recebida notificação para o pagamento: ${paymentId}`);
        try {
            await mercadoPagoService.handlePaymentNotification(paymentId);
            console.log(`[Webhook] Notificação do pagamento ${paymentId} processada com sucesso.`);
        } catch (error) {
            console.error(`[Webhook] Erro ao processar notificação para o pagamento ${paymentId}:`, error);
            // É importante retornar um status 500 para que o Mercado Pago tente reenviar a notificação.
            return res.status(500).send('Erro ao processar notificação.');
        }
    }

    // Retorna 200 para confirmar o recebimento da notificação para o Mercado Pago.
    res.status(200).send('Notificação recebida.');
};

module.exports = {
    createOneTimePayment,
    handleWebhook,
};
