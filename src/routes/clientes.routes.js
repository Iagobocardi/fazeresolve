const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const { clienteValidationRules } = require('../controllers/clientes.controller'); // Importa as regras de validação
const { validate } = require('../middlewares/validation.middleware'); // Importa o middleware de validação

// Define as rotas para o recurso de clientes
router.get('/', clientesController.getAllClientes);
router.get('/:id', clientesController.getClienteById);
router.post('/', clienteValidationRules, validate, clientesController.createCliente);
router.put('/:id', clienteValidationRules, validate, clientesController.updateCliente);
router.delete('/:id', clientesController.deleteCliente);
router.get('/:id/servicos', clientesController.getClienteHistoricoServicos);

module.exports = router;