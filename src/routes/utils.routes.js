const express = require('express');
const router = express.Router();
const utilsController = require('../controllers/utils.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Aplica o middleware de autenticação a todas as rotas de utilidades
router.use(authMiddleware);

// Rota para buscar endereço por CEP
router.get('/cep/:cep', utilsController.getAddressByCep);

module.exports = router;
