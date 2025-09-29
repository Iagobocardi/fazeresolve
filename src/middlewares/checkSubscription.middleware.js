const Conta = require('../models/conta.model');

const checkSubscription = async (req, res, next) => {
    // Permite que as requisições OPTIONS passem sem verificar a assinatura (importante para o CORS)
    if (req.method === 'OPTIONS') {
        return next();
    }

    try {
        // O auth.middleware já nos fornece o usuário completo, incluindo a contaId.
        const { contaId } = req.user;

        if (!contaId) {
            return res.status(401).json({ message: 'Acesso negado. Usuário não está associado a uma conta.' });
        }

        // Busca a conta para verificar o status da assinatura
        const conta = await Conta.findById(contaId);

        if (!conta) {
            return res.status(403).json({ message: 'Acesso negado. Conta não encontrada.' });
        }

        // Apenas contas com status 'ATIVO' podem acessar os recursos protegidos.
        if (conta.statusAssinatura === 'ATIVO') {
            return next(); // O usuário pode prosseguir.
        }

        // Se a assinatura não estiver em um estado permitido, nega o acesso.
        return res.status(403).json({
            message: 'Acesso negado. É necessária uma assinatura ativa para acessar este recurso.'
        });

    } catch (error) {
        console.error('Erro ao verificar a assinatura da conta:', error);
        return res.status(500).json({ message: 'Erro interno ao verificar a assinatura.' });
    }
};

module.exports = checkSubscription;
