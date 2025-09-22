// Arquivo: src/routes/orcamentos.routes.js

const express = require('express');
const router = express.Router();
const orcamentosController = require('../controllers/orcamentos.controller');
const utilsController = require('../controllers/utils.controller'); // Importa o controller de utils
const authMiddleware = require('../middlewares/auth.middleware');
const checkPermission = require('../middlewares/checkPermission.middleware');
const checkPlan = require('../middlewares/checkPlan.middleware');

// Rota de depuração temporária (sem autenticação)
router.get('/:pedidoId/debug-costs', orcamentosController.debugCosts);

// Aplica o middleware de autenticação a todas as rotas abaixo desta linha
router.use(authMiddleware);
const { orcamentoValidationRules } = require('../controllers/orcamentos.controller');
const { validate } = require('../middlewares/validation.middleware');
const { multerMemoryUpload, uploadToCloudinary } = require('../middlewares/cloudinary.middleware.js');

// Rotas mais específicas primeiro
router.get('/dados/categorias', checkPermission('ver_orcamentos'), orcamentosController.getDistinctCategorias);
router.get('/recentes', checkPermission('ver_orcamentos'), orcamentosController.getRecentOrcamentos);
router.get('/avaliar/:id/:nota', orcamentosController.registrarAvaliacao); // Rota pública, sem verificação de permissão
router.get('/agendados', checkPermission('ver_agenda'), orcamentosController.getAgendamentosParaCalendario); // Requer permissão de agenda
router.post(
    '/:id/upload-foto', 
    checkPermission('editar_orcamentos'), 
    multerMemoryUpload.single('foto'), 
    uploadToCloudinary('orcamentos'), 
    orcamentosController.uploadFotoServico
);
router.get('/:id/fatura-pdf', checkPermission('ver_orcamentos'), orcamentosController.gerarFaturaPDF);
router.get('/:id/orcamento-pdf', checkPermission('ver_orcamentos'), orcamentosController.gerarOrcamentoPDF);
router.get('/por-cliente/:clienteId', checkPermission('ver_clientes'), orcamentosController.getPedidosPorCliente); // Requer permissão de clientes
// --------------------------------
// ROTA para atualizar apenas o status
router.patch('/:id/status', checkPermission('editar_orcamentos'), orcamentosController.updateOrcamentoStatus);
router.patch('/:id/submit', checkPermission('editar_orcamentos'), orcamentosController.submitOrcamento);
router.patch('/:id/schedule', checkPermission('editar_agenda'), orcamentosController.scheduleOrcamento); // Requer permissão de agenda
router.patch('/:id/notas', checkPermission('editar_orcamentos'), orcamentosController.updateNotasInternas);
router.patch('/:id/pagamento', checkPermission('editar_orcamentos'), orcamentosController.updateStatusPagamento);

// Rotas para as novas funcionalidades que criámos
router.patch('/:id/operacional', checkPermission('editar_orcamentos'), orcamentosController.updateDetalhesOperacionais);
router.post('/:id/custos', checkPermission('editar_orcamentos'), orcamentosController.addCustoMaterial);

// Rota para sugerir preço foi movida para utils.routes.js
// Restaurando a rota antiga para manter a compatibilidade com o frontend existente.
router.post('/:id/sugerir-preco', checkPermission('editar_orcamentos'), utilsController.calcularPrecoVenda);


// Rota para ADICIONAR um novo pagamento a um orçamento
router.post('/:id/pagamentos', checkPermission('editar_orcamentos'), orcamentosController.adicionarPagamento);
// Rota para REMOVER um pagamento de um orçamento
router.delete('/:id/pagamentos/:pagamentoId', checkPermission('editar_orcamentos'), orcamentosController.removerPagamento);

// Rota para gerar um link de pagamento do Mercado Pago para um orçamento
router.post('/:id/gerar-link-pagamento', checkPermission('editar_orcamentos'), orcamentosController.gerarLinkPagamento);

// Rotas genéricas depois
router.get('/', checkPermission('ver_orcamentos'), orcamentosController.getAllOrcamentos);
router.get('/:id', checkPermission('ver_orcamentos'), orcamentosController.getOrcamentoById);
router.post('/', checkPermission('editar_orcamentos'), orcamentoValidationRules(), validate, orcamentosController.createOrcamento);
router.put('/:id', checkPermission('editar_orcamentos'), orcamentoValidationRules(), validate, orcamentosController.updateOrcamento);
router.delete('/:id', checkPermission('editar_orcamentos'), orcamentosController.deleteOrcamento);
router.post('/:orcamentoId/materiais', checkPermission('editar_orcamentos'), orcamentosController.adicionarMaterialAoPedido);
router.delete('/:orcamentoId/materiais/:materialUsadoId', checkPermission('editar_orcamentos'), orcamentosController.removerMaterialDoPedido);
//  Rota para a ação rápida de marcar como pago
router.post('/:id/marcar-pago', checkPermission('editar_orcamentos'), orcamentosController.marcarComoPago);

router.patch('/:id/attach-invoice', checkPermission('editar_orcamentos'), orcamentosController.attachInvoice);

router.delete('/:orcamentoId/custos/:custoId', checkPermission('editar_orcamentos'), orcamentosController.removeCustoMaterial);

// --- Rota para Automação de Cobrança ---
router.post('/:id/enviar-cobranca', checkPlan(['Premium']), checkPermission('editar_orcamentos'), orcamentosController.enviarCobranca);


module.exports = router;
