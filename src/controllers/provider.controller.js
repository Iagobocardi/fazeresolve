const Cliente = require('../models/cliente.model');

/**
 * Controller para atualizar as configurações de pagamento de um prestador.
 */
const updatePaymentSettings = async (req, res) => {
    try {
        const providerId = req.user.id; // ID do prestador logado, vindo do authMiddleware
        const { metodoRecebimento, chavePixManual } = req.body;

        // Validação básica
        if (!metodoRecebimento || (metodoRecebimento === 'MANUAL' && !chavePixManual)) {
            return res.status(400).json({ message: 'Dados de configuração de pagamento inválidos.' });
        }

        const updateData = {
            metodoRecebimento: metodoRecebimento,
            $unset: { credenciaisMercadoPago: "" } // Garante que o campo seja removido
        };

        if (metodoRecebimento === 'MANUAL') {
            updateData.chavePixManual = chavePixManual;
        } else {
            updateData.chavePixManual = null; // Limpa a chave pix se mudar para Mercado Pago
        }

        const updatedProvider = await Cliente.findByIdAndUpdate(
            providerId,
            { $set: updateData },
            { new: true, select: '-password' } // Retorna o doc atualizado e exclui a senha
        );

        if (!updatedProvider) {
            return res.status(404).json({ message: 'Prestador não encontrado.' });
        }

        res.status(200).json({ message: 'Configurações de pagamento atualizadas com sucesso!', provider: updatedProvider });

    } catch (error) {
        console.error('Erro ao atualizar configurações de pagamento:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
    updatePaymentSettings,
};
