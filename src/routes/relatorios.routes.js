const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');

// Importa o controller com a sintaxe correta
const relatoriosController = require('../controllers/relatorios.controller');
const checkPermission = require('../middlewares/checkPermission.middleware');

// Aplica o middleware de autenticação a todas as rotas
router.use(authMiddleware);

// Define as rotas, cada uma apontando para uma função exportada do controller
router.get('/servicos/pdf', relatoriosController.gerarRelatorioServicosPDF);
router.get('/financeiro/pdf', relatoriosController.gerarRelatorioFinanceiroPDF);
router.get('/orcamentos/pdf', relatoriosController.gerarRelatorioOrcamentosPDF);
router.get('/agendamentos/pdf', relatoriosController.gerarRelatorioAgendamentos); // Corrigido para pdf
router.get('/receita-vs-despesa/pdf', relatoriosController.gerarRelatorioReceitaVsDespesa);
router.get('/satisfacao-cliente/pdf', relatoriosController.gerarRelatorioSatisfacaoCliente);

// --- Novas Rotas para Relatórios de Estoque ---
router.get('/estoque/valor-total', checkPermission('ver_financeiro'), relatoriosController.getValorTotalEstoque);
router.get('/estoque/niveis', checkPermission('ver_financeiro'), relatoriosController.getNiveisEstoque);
router.get('/estoque/historico/:produtoId', checkPermission('ver_financeiro'), relatoriosController.getHistoricoProduto);


module.exports = router;
