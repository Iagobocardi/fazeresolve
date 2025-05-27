// Arquivo: src/routes/relatorios.routes.js
const express = require('express');
const router = express.Router();
const relatoriosController = require('../controllers/relatorios.controller');

router.get('/servicos/pdf', relatoriosController.gerarRelatorioServicosPDF);
router.get('/financeiro/pdf', relatoriosController.gerarRelatorioFinanceiroPDF);
router.get('/orcamentos/pdf', relatoriosController.gerarRelatorioOrcamentosPDF);
router.get('/agendamentos', relatoriosController.gerarRelatorioAgendamentos);


module.exports = router;