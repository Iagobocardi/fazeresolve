// Arquivo: src/controllers/pagamento.controller.js
const mercadopago = require('mercadopago');
const Conta = require('../models/conta.model');
const Usuario = require('../models/usuario.model');
const PLANS = require('../config/plans.config.js');
const mercadoPagoService = require('../services/mercadoPago.service');

const createOnetimePayment = async (req, res) => {
    try {
        const { paymentMethod, planId, cardToken, installments, issuerId } = req.body;
        const { contaId } = req.user;
        const usuario = await Usuario.findOne({ contaId: contaId, role: 'Dono' });
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário principal da conta não encontrado.' });
        }

        const conta = await Conta.findById(contaId);
        if (!conta || conta.planId !== planId) {
            return res.status(400).json({ message: 'Plano da conta não corresponde ao plano da solicitação.' });
        }

        const selectedPlan = PLANS.flatMap(p => p.oneTime).find(p => p.id === planId);
        if (!selectedPlan) {
            return res.status(404).json({ message: 'Plano não encontrado.' });
        }

        const commonPaymentData = {
            transaction_amount: parseFloat(selectedPlan.price),
            description: `Acesso ${selectedPlan.name} por ${selectedPlan.months} meses`,
            payer: { email: usuario.email },
            external_reference: `${conta._id}_${planId}`,
            notification_url: `${process.env.API_URL}/pagamentos/mercado-pago-webhook`,
        };

        if (paymentMethod === 'pix') {
            const pixData = await mercadoPagoService.createPixPayment({
                ...commonPaymentData,
                payment_method_id: 'pix',
            });

            if (!pixData.point_of_interaction?.transaction_data) {
                console.error("Resposta do MP para PIX não contém transaction_data:", pixData);
                return res.status(500).json({ message: 'Falha ao obter os dados do QR Code do PIX.' });
            }

            return res.status(201).json({
                message: 'Cobrança PIX criada com sucesso. Pague para ativar.',
                paymentInfo: {
                    type: 'pix',
                    paymentId: pixData.id,
                    qrCode: pixData.point_of_interaction.transaction_data.qr_code,
                    qrCodeBase64: pixData.point_of_interaction.transaction_data.qr_code_base64,
                }
            });
        } else if (paymentMethod === 'card') {
            if (!cardToken) {
                return res.status(400).json({ message: 'O token do cartão é obrigatório para pagamentos com cartão.' });
            }
            
            const cardPaymentData = {
                ...commonPaymentData,
                token: cardToken,
                installments: installments || 1,
                payment_method_id: req.body.paymentMethodId, // ex: 'visa'
                issuer_id: issuerId,
            };

            const paymentResult = await mercadoPagoService.createCardPayment(cardPaymentData);

            // A lógica de ativação foi removida daqui.
            // O webhook agora é a única fonte de verdade para ativar a conta,
            // garantindo consistência entre pagamentos de Cartão e PIX.
            return res.status(201).json({
                message: `Pagamento com cartão enviado. Status: ${paymentResult.status}. A confirmação final será processada em breve.`,
                paymentInfo: {
                    type: 'card',
                    paymentId: paymentResult.id,
                    status: paymentResult.status,
                    statusDetail: paymentResult.status_detail,
                }
            });
        } else {
            return res.status(400).json({ message: 'Método de pagamento inválido.' });
        }
    } catch (error) {
        console.error("Erro ao criar pagamento único:", error);
        res.status(500).json({ message: error.message || 'Erro interno no servidor ao processar pagamento.' });
    }
};

module.exports = {
    createOnetimePayment,
};
