const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiro.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['Dono', 'ADMIN']));

router.get('/', financeiroController.getResumoFinanceiro);
router.post('/', financeiroController.createManualTransacao);

// As rotas abaixo foram comentadas porque as funções correspondentes não existem no controller.
// router.get('/:id', financeiroController.getFinanceiroById);
// router.put('/:id', financeiroValidationRules, validate, financeiroController.updateFinanceiro);
// router.delete('/:id', financeiroController.deleteFinanceiro);

module.exports = router;
