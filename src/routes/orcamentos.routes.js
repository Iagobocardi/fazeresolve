// Arquivo: src/routes/orcamentos.routes.js

const express = require('express');
const router = express.Router();
const orcamentosController = require('../controllers/orcamentos.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR', 'ADMIN']));
const { orcamentoValidationRules } = require('../controllers/orcamentos.controller');
const { validate } = require('../middlewares/validation.middleware');
const upload = require('../config/multer.config.js');

// Rotas mais específicas primeiro
router.get('/recentes', orcamentosController.getRecentOrcamentos);
router.get('/avaliar/:id/:nota', orcamentosController.registrarAvaliacao);
router.get('/agendados', orcamentosController.getAgendamentosParaCalendario);
router.post('/:id/upload-foto', upload.single('foto'), orcamentosController.uploadFotoServico);
router.get('/:id/fatura-pdf', orcamentosController.gerarFaturaPDF);
router.get('/:id/orcamento-pdf', orcamentosController.gerarOrcamentoPDF);
router.get('/por-cliente/:clienteId', orcamentosController.getPedidosPorCliente);
// --------------------------------
// ROTA para atualizar apenas o status
router.patch('/:id/status', orcamentosController.updateOrcamentoStatus);
router.patch('/:id/submit', orcamentosController.submitOrcamento);
router.patch('/:id/schedule', orcamentosController.scheduleOrcamento);
router.patch('/:id/notas', orcamentosController.updateNotasInternas);
router.patch('/:id/pagamento', orcamentosController.updateStatusPagamento);

// Rotas para as novas funcionalidades que criámos
router.patch('/:id/operacional', orcamentosController.updateDetalhesOperacionais);
router.post('/:id/custos', orcamentosController.addCustoMaterial);

// --- ADICIONE A NOVA ROTA AQUI ---
router.post('/:pedidoId/sugerir-preco', orcamentosController.calcularPrecoSugerido);

// Rota para ADICIONAR um novo pagamento a um orçamento
router.post('/:id/pagamentos', orcamentosController.adicionarPagamento);
// Rota para REMOVER um pagamento de um orçamento
router.delete('/:id/pagamentos/:pagamentoId', orcamentosController.removerPagamento);

// Rota para gerar um link de pagamento do Mercado Pago para um orçamento
router.post('/:id/gerar-link-pagamento', orcamentosController.gerarLinkPagamento);

// Rotas genéricas depois
router.get('/', orcamentosController.getAllOrcamentos);
router.get('/:id', orcamentosController.getOrcamentoById);
router.post('/', orcamentoValidationRules(), validate, orcamentosController.createOrcamento);
router.put('/:id', orcamentoValidationRules(), validate, orcamentosController.updateOrcamento);
router.delete('/:id', orcamentosController.deleteOrcamento)
router.post('/:orcamentoId/materiais', orcamentosController.adicionarMaterialAoPedido);
router.delete('/:orcamentoId/materiais/:materialUsadoId', orcamentosController.removerMaterialDoPedido);
//  Rota para a ação rápida de marcar como pago
router.post('/:id/marcar-pago', orcamentosController.marcarComoPago);

router.patch('/:id/attach-invoice', orcamentosController.attachInvoice);

router.delete('/:orcamentoId/custos/:custoId', orcamentosController.removeCustoMaterial);

module.exports = router;
