const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validation.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const checkPermission = require('../middlewares/checkPermission.middleware');

// Aplica o middleware de autenticação a todas as rotas
router.use(authMiddleware);

// Regras de validação
const createClienteRules = [
    body('nome').notEmpty().withMessage('O nome é obrigatório.').trim(),
    body('telefone').notEmpty().withMessage('O telefone é obrigatório.').isString().trim(),
    body('email').optional().isEmail().withMessage('O email fornecido não é válido.').normalizeEmail()
];
const updateClienteRules = [
    body('nome').optional().notEmpty().withMessage('O nome não pode ser vazio.').trim(),
    body('telefone').optional().isString().trim(),
    body('email').optional().isEmail().withMessage('O email fornecido não é válido.').normalizeEmail()
];

// --- Rotas com Validação e Permissões Aplicadas ---
router.get('/', checkPermission('ver_clientes'), clientesController.getAllClientes);
router.get('/novo', checkPermission('editar_clientes'), clientesController.paginaCriarCliente); // Rota para a página de criação
router.get('/:id', checkPermission('ver_clientes'), clientesController.buscarClientePorId);
router.post('/', checkPermission('editar_clientes'), createClienteRules, validate, clientesController.criarCliente);
router.put('/:id', checkPermission('editar_clientes'), updateClienteRules, validate, clientesController.atualizarCliente);
router.delete('/:id', checkPermission('editar_clientes'), clientesController.deletarCliente);
router.get('/:id/details', checkPermission('ver_clientes'), clientesController.getClienteComPedidos);
router.post('/:id/gerar-convite', checkPermission('editar_clientes'), clientesController.gerarConvitePortal);

module.exports = router;
