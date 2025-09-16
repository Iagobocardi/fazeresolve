const mercadoPagoService = require('../services/mercadoPago.service.js');

exports.createPixCharge = async (req, res) => {
    try {
        console.log('[createPixCharge] Iniciando criação de cobrança Pix.');
        const { amount, description, email } = req.body;
        console.log('[createPixCharge] Dados recebidos:', { amount, description, email });
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

        console.log('[createPixCharge] Enviando dados para o serviço do Mercado Pago...');
        const result = await mercadoPagoService.createPixPayment(paymentData);
        console.log('[createPixCharge] Cobrança Pix criada com sucesso.');

        res.status(201).json({
            qr_code: result.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
        });
    } catch (error) {
        console.error("Erro ao criar cobrança Pix:", error);
        res.status(500).json({ message: 'Erro interno ao criar cobrança Pix.' });
    }
};
