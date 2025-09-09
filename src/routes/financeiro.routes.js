const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiro.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware.js');

// Protege todas as rotas financeiras, permitindo acesso apenas ao Dono da conta.
const needsAuth = [authMiddleware, roleMiddleware(['Dono', 'ADMIN'])];

/**
 * @route GET /api/financeiro/resumo
 * @description Retorna um resumo financeiro (faturamento, despesas, lucro).
 * @access Privado (Dono, ADMIN)
 */
router.get('/resumo', needsAuth, financeiroController.getResumoFinanceiro);

/**
 * @route GET /api/financeiro/historico
 * @description Retorna o histórico de transações paginadas.
 * @access Privado (Dono, ADMIN)
 */
router.get('/historico', needsAuth, financeiroController.getHistoricoTransacoes);

/**
 * @route POST /api/financeiro/transacoes
 * @description Cria uma nova transação manual (receita ou despesa).
 * @access Privado (Dono, ADMIN)
 */
router.post('/transacoes', needsAuth, financeiroController.createManualTransacao);

module.exports = router;
