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
        const conta = await Conta.findById(contaId._id);

        if (!conta) {
            return res.status(403).json({ message: 'Acesso negado. Conta não encontrada.' });
        }

        // Se for um plano de pagamento único, verifica a data de validade.
        if (conta.paymentType === 'onetime') {
            if (conta.acessoValidoAte && conta.acessoValidoAte > new Date()) {
                return next(); // Acesso único está OK.
            }
        } else {
            // Se for uma assinatura, verifica o status.
            const allowedStatus = ['ATIVO', 'EM_ATRASO', 'AGUARDANDO_PAGAMENTO'];
            if (allowedStatus.includes(conta.statusAssinatura)) {
                return next(); // Assinatura recorrente está OK.
            }
        }

        // Se nenhuma das condições for atendida, nega o acesso.
        return res.status(403).json({
            message: 'Acesso negado. É necessária uma assinatura ativa ou um pacote de acesso válido para acessar este recurso.'
        });

    } catch (error) {
        console.error('Erro ao verificar a assinatura da conta:', error);
        return res.status(500).json({ message: 'Erro interno ao verificar a assinatura.' });
    }
};

module.exports = checkSubscription;
