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

        const provider = await Cliente.findById(providerId);

        if (!provider || provider.role !== 'PRESTADOR') {
            return res.status(404).json({ message: 'Prestador não encontrado.' });
        }

        // Atualiza os campos
        provider.metodoRecebimento = metodoRecebimento;
        if (metodoRecebimento === 'MANUAL') {
            provider.chavePixManual = chavePixManual;
            // Limpa as credenciais do MP se estiver mudando para manual
            provider.credenciaisMercadoPago = undefined;
        } else {
            // A lógica de conexão com o Mercado Pago será tratada em outra rota
            provider.chavePixManual = undefined;
        }

        await provider.save();

        // Retorna o usuário atualizado (sem a senha)
        const providerToReturn = provider.toObject();
        delete providerToReturn.password;

        res.status(200).json({ message: 'Configurações de pagamento atualizadas com sucesso!', provider: providerToReturn });

    } catch (error) {
        console.error('Erro ao atualizar configurações de pagamento:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

module.exports = {
    updatePaymentSettings,
};
