// Arquivo: src/routes/clientes.routes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clientes.controller');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validation.middleware'); // O nosso middleware de validação

// Regras de validação para criar um cliente
const createClienteRules = [
    body('nome').notEmpty().withMessage('O nome é obrigatório.').trim(),
    body('telefone').notEmpty().withMessage('O telefone é obrigatório.').isString().trim(),
    body('email').optional().isEmail().withMessage('O email fornecido não é válido.').normalizeEmail()
];

// Regras de validação para atualizar um cliente (os campos são opcionais)
const updateClienteRules = [
    body('nome').optional().notEmpty().withMessage('O nome não pode ser vazio.').trim(),
    body('telefone').optional().isString().trim(),
    body('email').optional().isEmail().withMessage('O email fornecido não é válido.').normalizeEmail()
];

// --- Rotas com Validação Aplicada ---
router.get('/', clienteController.listarClientes);
router.get('/:id', clienteController.buscarClientePorId);

// A rota POST agora usa as regras de validação e o middleware 'validate'
router.post('/', createClienteRules, validate, clienteController.criarCliente);

// A rota PUT também usa as suas próprias regras
router.put('/:id', updateClienteRules, validate, clienteController.atualizarCliente);

router.delete('/:id', clienteController.deletarCliente);

module.exports = router;
