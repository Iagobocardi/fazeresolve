const Conta = require('../models/conta.model');

const checkSubscription = async (req, res, next) => {
    // Permite que requisições OPTIONS passem sem verificação (essencial para CORS preflight)
    if (req.method === 'OPTIONS') {
        return next();
    }

    try {
        const { contaId } = req.user;
        if (!contaId || !contaId._id) {
            return res.status(401).json({ message: 'Acesso negado. Usuário não está associado a uma conta.' });
        }

        const conta = await Conta.findById(contaId._id).select('paymentType acessoValidoAte statusAssinatura gracePeriodExpiresAt').lean();
        if (!conta) {
            return res.status(403).json({ message: 'Acesso negado. Conta não encontrada.' });
        }

        const now = new Date();
        const hasValidGracePeriod = conta.gracePeriodExpiresAt && new Date(conta.gracePeriodExpiresAt) > now;
        const hasActiveSubscription = conta.statusAssinatura === 'ATIVO';
        const hasValidOnetimePackage = conta.paymentType === 'onetime' && conta.acessoValidoAte && new Date(conta.acessoValidoAte) > now;

        // --- Lógica de Acesso Total ---
        // Concede acesso total se a assinatura estiver ativa, se tiver um pacote único válido,
        // ou se estiver aguardando pagamento mas ainda dentro do período de carência.
        if (hasActiveSubscription || hasValidOnetimePackage || (conta.statusAssinatura === 'AGUARDANDO_PAGAMENTO' && hasValidGracePeriod)) {
            return next();
        }

        // --- Lógica de Acesso Parcial (Soft Block) ---
        // Concede acesso de apenas leitura (GET) se a assinatura tiver algum problema de pagamento
        // E o período de carência tiver expirado (ou nunca existiu).
        const isPaymentIssue = ['AGUARDANDO_PAGAMENTO', 'EM_ATRASO', 'CANCELADO'].includes(conta.statusAssinatura);
        if (isPaymentIssue && !hasValidGracePeriod) {
            if (req.method === 'GET') {
                return next(); // Permite requisições de leitura
            } else {
                // Bloqueia requisições de escrita
                return res.status(403).json({
                    message: 'Sua conta está bloqueada para novas ações. Por favor, regularize o pagamento para reativar todas as funcionalidades.',
                    subscription_status: 'LOCKED'
                });
            }
        }

        // --- Bloqueio Total ---
        // Se nenhuma das condições acima for atendida, o acesso é negado.
        return res.status(403).json({
            message: 'Acesso negado. É necessária uma assinatura ativa ou um pacote de acesso válido.'
        });

    } catch (error) {
        console.error('Erro crítico ao verificar a assinatura da conta:', error);
        return res.status(500).json({ message: 'Erro interno ao verificar a assinatura.' });
    }
};

module.exports = checkSubscription;
