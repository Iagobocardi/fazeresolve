const express = require('express');
const router = express.Router();
const invoicesController = require('../controllers/invoices.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware.js');

// Protege todas as rotas de invoices, acessíveis apenas para prestadores
router.use(authMiddleware);
router.use(roleMiddleware(['Dono']));

// Rotas CRUD
router.post('/', invoicesController.createInvoice);
router.get('/', invoicesController.getAllInvoices);
router.get('/:id', invoicesController.getInvoiceById);
router.put('/:id', invoicesController.updateInvoice);
router.delete('/:id', invoicesController.deleteInvoice);

// Rota especial para emitir a nota fiscal
router.post('/:id/emitir', invoicesController.issueInvoice);

module.exports = router;
