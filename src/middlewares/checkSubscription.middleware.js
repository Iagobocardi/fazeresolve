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

        const now = new Date();

        // 1. Acesso totalmente permitido
        if (
            (conta.paymentType === 'onetime' && conta.acessoValidoAte && conta.acessoValidoAte > now) ||
            (conta.statusAssinatura === 'ATIVO') ||
            (conta.statusAssinatura === 'AGUARDANDO_PAGAMENTO' && conta.gracePeriodExpiresAt && conta.gracePeriodExpiresAt > now)
        ) {
            return next();
        }

        // 2. Acesso em modo "Soft Block" (apenas leitura)
        const isPaymentPending = ['AGUARDANDO_PAGAMENTO', 'EM_ATRASO', 'CANCELADO'].includes(conta.statusAssinatura);
        const gracePeriodExpired = !conta.gracePeriodExpiresAt || now > conta.gracePeriodExpiresAt;

        if (isPaymentPending && gracePeriodExpired) {
            if (req.method === 'GET') {
                return next(); // Permite requisições de leitura (carregar dados)
            } else {
                // Bloqueia ações de escrita (salvar, criar, deletar)
                return res.status(403).json({
                    message: 'Sua conta está bloqueada para novas ações. Por favor, regularize o pagamento para reativar todas as funcionalidades.',
                    subscription_status: 'LOCKED'
                });
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
