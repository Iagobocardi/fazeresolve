// Em: src/routes/estoque.routes.js

const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoque.controller');
const checkPlan = require('../middlewares/checkPlan.middleware.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR']));

// A rota só será acedida se o utilizador estiver autenticado, for PRESTADOR E tiver o plano 'Profissional' ou 'Premium'
router.post('/add-batch', checkPlan(['Profissional', 'Premium']), estoqueController.addItemsInBatch);

module.exports = router;