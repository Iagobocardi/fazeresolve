const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validation.middleware');

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

// --- Rotas com Validação Aplicada ---
router.get('/', clientesController.getAllClientes);
router.get('/:id', clientesController.buscarClientePorId);
router.post('/', createClienteRules, validate, clientesController.criarCliente);
router.put('/:id', updateClienteRules, validate, clientesController.atualizarCliente);
router.delete('/:id', clientesController.deletarCliente);

module.exports = router;