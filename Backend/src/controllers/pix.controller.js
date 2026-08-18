const mercadoPagoService = require('../services/mercadoPago.service.js');
const Conta = require('../models/conta.model'); // Importar o modelo Conta

const Usuario = require('../models/usuario.model');

exports.createPixCharge = async (req, res) => {
    try {
        const { amount, description, email } = req.body;
        const { userId, contaId, nome } = req.user;

        const conta = await Conta.findById(contaId);
        const usuario = await Usuario.findById(userId); // Buscar o usuário para pegar o CPF

        const cnpj = conta?.companyInfo?.cnpj;
        const cpf = usuario?.cpf;

        let identification;
        if (cnpj) {
            identification = { type: 'CNPJ', number: cnpj.replace(/\D/g, '') };
        } else if (cpf) {
            identification = { type: 'CPF', number: cpf.replace(/\D/g, '') };
        } else {
            return res.status(400).json({ message: 'CPF ou CNPJ do pagador não encontrado. Por favor, complete seu cadastro.' });
        }

        const nameParts = nome.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;

        const paymentData = {
            transaction_amount: parseFloat(amount),
            description: description,
            payment_method_id: 'pix',
            payer: {
                email: email,
                first_name: firstName,
                last_name: lastName,
                identification: identification,
            },
            external_reference: contaId.toString(),
        };

        const result = await mercadoPagoService.createPixPayment(paymentData);

        if (result.point_of_interaction?.transaction_data) {
            res.status(201).json({
                qr_code: result.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: result.point_of_interaction.transaction_data.qr_code_base64,
            });
        } else {
            console.error("Resposta inesperada da API do Mercado Pago:", result);
            res.status(500).json({ message: 'Resposta inesperada do gateway de pagamento.' });
        }
    } catch (error) {
        console.error("Erro ao criar cobrança Pix:", error);
        res.status(500).json({ message: 'Erro interno ao criar cobrança Pix.' });
    }
};
