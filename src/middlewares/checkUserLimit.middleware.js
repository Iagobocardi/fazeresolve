// Em: src/middlewares/checkUserLimit.middleware.js

const Conta = require('../models/conta.model');
const Usuario = require('../models/usuario.model');

// Define os limites de base de usuários para cada plano
const PLAN_LIMITS = {
    Essencial: 1,
    Profissional: 2,
    Premium: 5
};

const checkUserLimit = async (req, res, next) => {
    try {
        // O middleware de autenticação (authMiddleware) já nos fornece o contaId do usuário logado.
        const { contaId } = req.user;

        if (!contaId) {
            // Isso não deve acontecer se o authMiddleware estiver funcionando corretamente.
            return res.status(401).json({ message: 'Usuário não associado a uma conta.' });
        }

        // 1. Encontra a conta para obter o plano de assinatura.
        const conta = await Conta.findById(contaId);
        if (!conta) {
            return res.status(404).json({ message: 'Conta não encontrada.' });
        }
        
        // 2. Determina o limite de usuários com base no plano da conta.
        const planoAtual = conta.plano;
        const limite = PLAN_LIMITS[planoAtual];

        if (limite === undefined) {
            // Se o plano não estiver em PLAN_LIMITS, bloqueia por segurança.
            return res.status(400).json({ message: `Plano '${planoAtual}' inválido ou sem limite de usuários definido.` });
        }

        // 3. Conta quantos usuários JÁ EXISTEM para esta conta.
        const totalUsuarios = await Usuario.countDocuments({ contaId: contaId });

        // 4. Verifica se o limite de base foi atingido.
        req.billing_update_required = false; // Garante que a flag comece como falsa.
        if (totalUsuarios >= limite) {
            // Se o limite foi atingido, verifica se o plano permite usuários adicionais.
            if (planoAtual === 'Profissional' || planoAtual === 'Premium') {
                // Se for um plano flexível, marca a requisição para que o controller atualize a cobrança.
                req.billing_update_required = true;
            } else {
                // Se for o plano Essencial ou outro plano não flexível, bloqueia a criação.
                return res.status(403).json({
                    message: `Limite de ${limite} usuários para o plano ${planoAtual} atingido. Faça um upgrade para adicionar mais membros.`
                });
            }
        }

        // Permite que a requisição continue para o próximo passo (o controller).
        next();

    } catch (error) {
        console.error("Erro no middleware checkUserLimit:", error);
        res.status(500).json({ message: 'Erro interno ao verificar o limite de usuários.' });
    }
};

module.exports = checkUserLimit;