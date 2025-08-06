const express = require('express');
const router = express.Router();

// Importa o controller com a sintaxe correta
const relatoriosController = require('../controllers/relatorios.controller');

// Define as rotas, cada uma apontando para uma função exportada do controller
router.get('/servicos/pdf', relatoriosController.gerarRelatorioServicosPDF);
router.get('/financeiro/pdf', relatoriosController.gerarRelatorioFinanceiroPDF);
router.get('/orcamentos/pdf', relatoriosController.gerarRelatorioOrcamentosPDF);
router.get('/agendamentos/pdf', relatoriosController.gerarRelatorioAgendamentos); // Corrigido para pdf
router.get('/receita-vs-despesa/pdf', relatoriosController.gerarRelatorioReceitaVsDespesa);
router.get('/satisfacao-cliente/pdf', relatoriosController.gerarRelatorioSatisfacaoCliente);

module.exports = router;
