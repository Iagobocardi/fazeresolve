// Em: src/middlewares/checkUserLimit.middleware.js

const MembroEquipe = require('../models/membroEquipe.model');
const Cliente = require('../models/cliente.model');

// Define os limites de utilizadores para cada plano
const PLAN_LIMITS = {
    Essencial: 1,    // Apenas o dono da conta
    Profissional: 5, // O dono + 4 membros
    Premium: 15      // O dono + 14 membros
};

const checkUserLimit = async (req, res, next) => {
    try {
        // Supondo que o authMiddleware coloca os dados do admin em req.user
        const adminId = req.user.id; 

        // 1. Encontra a conta principal para saber qual é o plano
        const contaPrincipal = await Cliente.findById(adminId);
        if (!contaPrincipal) {
            return res.status(404).json({ message: 'Conta principal não encontrada.' });
        }
        
        const planoAtual = contaPrincipal.plano;
        const limite = PLAN_LIMITS[planoAtual];

        // 2. Conta quantos membros já existem para esta conta
        const contagemMembros = await MembroEquipe.countDocuments({ contaPrincipal: adminId });
        
        // 3. O total de utilizadores é a soma dos membros + o próprio admin (1)
        const totalUtilizadores = contagemMembros + 1;

        // 4. Verifica se o limite foi atingido
        if (totalUtilizadores >= limite) {
            return res.status(403).json({ 
                message: `Limite de ${limite} utilizadores para o plano ${planoAtual} atingido. Faça um upgrade para adicionar mais membros.` 
            });
        }

        next(); // Limite não atingido, pode prosseguir para criar o utilizador.

    } catch (error) {
        res.status(500).json({ message: 'Erro ao verificar o limite de utilizadores.' });
    }
};

module.exports = checkUserLimit;