const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiro.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

// Rota principal para a visão geral financeira
// GET /api/financeiro/overview
router.get('/overview', authMiddleware, financeiroController.getFinancialOverview);

module.exports = router;
