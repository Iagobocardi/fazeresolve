const subscriptionService = require('../services/subscription.service.js');

exports.createPixCharge = async (req, res) => {
    try {
        res.status(200).json({ message: 'Pix charge created successfully.' });
    } catch (error) {
        console.error("Erro ao criar cobrança Pix:", error);
        res.status(500).json({ message: 'Erro interno ao criar cobrança Pix.' });
    }
};
const subscriptionService = require('../services/subscription.service.js');

const mercadoPagoService = require('../services/mercadoPago.service.js');

exports.createPixCharge = async (req, res) => {
    try {
        const { amount, description, email } = req.body;
        const { contaId } = req.user;

        const paymentData = {
            transaction_amount: amount,
            description: description,
            payment_method_id: 'pix',
            payer: {
                email: email,
            },
            external_reference: contaId,
        };

        const result = await mercadoPagoService.createPixPayment(paymentData);

        res.status(201).json({
            qr_code: result.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
        });
    } catch (error) {
        console.error("Erro ao criar cobrança Pix:", error);
        res.status(500).json({ message: 'Erro interno ao criar cobrança Pix.' });
    }
};
