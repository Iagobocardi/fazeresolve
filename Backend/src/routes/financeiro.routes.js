const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiro.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

// Rota principal para a visão geral financeira
// GET /api/financeiro/overview
router.get('/overview', authMiddleware, financeiroController.getFinancialOverview);

// Rotas existentes para transações manuais
router.get('/resumo', authMiddleware, financeiroController.getResumoFinanceiro);
router.get('/historico', authMiddleware, financeiroController.getHistoricoTransacoes);
router.post('/transacao', authMiddleware, financeiroController.createManualTransacao);
router.delete('/transacao/:id', authMiddleware, financeiroController.deleteManualTransacao);


module.exports = router;
