const Subscription = require('../models/subscription.model.js');

const checkSubscription = async (req, res, next) => {
    try {
        const userId = req.user.id; // Supondo que o middleware de autenticação adiciona o usuário a req.user

        if (!userId) {
            return res.status(401).json({ message: 'Acesso negado. Usuário não autenticado.' });
        }

        // Procura por uma assinatura ativa para o usuário
        const subscription = await Subscription.findOne({ userId: userId });

        // Verifica se a assinatura existe e se está autorizada
        if (subscription && subscription.status === 'authorized') {
            return next(); // O usuário tem uma assinatura ativa, pode prosseguir.
        }

        // Se não houver assinatura ou se não estiver ativa, nega o acesso.
        return res.status(403).json({
            message: 'Acesso negado. É necessária uma assinatura ativa para acessar este recurso.'
        });

    } catch (error) {
        console.error('Erro ao verificar a assinatura:', error);
        return res.status(500).json({ message: 'Erro interno ao verificar a assinatura.' });
    }
};

module.exports = checkSubscription;
