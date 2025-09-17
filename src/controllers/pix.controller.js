const mercadoPagoService = require('../services/mercadoPago.service.js');
const Conta = require('../models/conta.model'); // Importar o modelo Conta

exports.createPixCharge = async (req, res) => {
    try {
        const { amount, description, email } = req.body;
        const { contaId, nome } = req.user; // Obter nome do usuário do req.user

        // 1. Buscar a conta para obter o CNPJ
        const conta = await Conta.findById(contaId);
        if (!conta || !conta.companyInfo?.cnpj) {
            return res.status(400).json({ message: 'CNPJ da conta não encontrado ou inválido.' });
        }

        // 2. Preparar os dados do pagador
        const nameParts = nome.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName; // Fallback para sobrenome
        const cnpj = conta.companyInfo.cnpj.replace(/\D/g, '');

        const paymentData = {
            transaction_amount: parseFloat(amount),
            description: description,
            payment_method_id: 'pix',
            payer: {
                email: email,
                first_name: firstName,
                last_name: lastName,
                identification: {
                    type: 'CNPJ',
                    number: cnpj,
                },
            },
            external_reference: contaId.toString(),
        };

        const result = await mercadoPagoService.createPixPayment(paymentData);

        // A resposta de sucesso do MP para PIX contém o QR Code nos dados do ponto de interação
        if (result.point_of_interaction?.transaction_data) {
            res.status(201).json({
                qr_code: result.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
            });
        } else {
            // Fallback caso a resposta não venha como esperado
            console.error("Resposta inesperada da API do Mercado Pago:", result);
            res.status(500).json({ message: 'Resposta inesperada do gateway de pagamento.' });
        }
    } catch (error) {
        console.error("Erro ao criar cobrança Pix:", error);
        res.status(500).json({ message: 'Erro interno ao criar cobrança Pix.' });
    }
};
