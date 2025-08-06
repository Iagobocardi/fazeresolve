// Em: src/routes/estoque.routes.js

const express = require('express');
const router = express.Router();
const estoqueController = require('../controllers/estoque.controller');
const checkPlan = require('../middlewares/checkPlan.middleware.js'); // 1. Importe o middleware
// const authMiddleware = require('../middlewares/auth.middleware.js'); // Você também precisará de um middleware de autenticação

// 2. Aplique o middleware na rota
// A rota só será acedida se o utilizador estiver autenticado E tiver o plano 'Profissional' ou 'Premium'
router.post('/add-batch', /* authMiddleware, */ checkPlan(['Profissional', 'Premium']), estoqueController.addItemsInBatch);

module.exports = router;