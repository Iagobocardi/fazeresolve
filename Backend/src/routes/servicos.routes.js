const express = require('express');
const router = express.Router();
const servicosController = require('../controllers/servicos.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['Dono', 'ADMIN']));
const { servicoValidationRules } = require('../controllers/servicos.controller');
const { validate } = require('../middlewares/validation.middleware');

router.get('/', servicosController.getAllServicos);
router.get('/dados/categorias', servicosController.getDistinctCategorias);
router.get('/:id', servicosController.getServicoById);
router.post('/', servicoValidationRules, validate, servicosController.createServico);
router.put('/:id', servicoValidationRules, validate, servicosController.updateServico);
router.delete('/:id', servicosController.deleteServico);

module.exports = router;
