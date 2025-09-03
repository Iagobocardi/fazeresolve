const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiro.controller');
const { financeiroValidationRules } = require('../controllers/financeiro.controller');
const { validate } = require('../middlewares/validation.middleware');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['Dono', 'ADMIN']));

router.get('/', financeiroController.getAllFinanceiro);
router.get('/:id', financeiroController.getFinanceiroById);
router.post('/', financeiroValidationRules, validate, financeiroController.createFinanceiro);
router.put('/:id', financeiroValidationRules, validate, financeiroController.updateFinanceiro);
router.delete('/:id', financeiroController.deleteFinanceiro);

module.exports = router;
