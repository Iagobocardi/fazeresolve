const express = require('express');
const router = express.Router();
const conversaController = require('../controllers/conversa.controller');

// --- CORREÇÃO APLICADA AQUI ---
// Assumimos que o seu middleware de autenticação se chama 'authMiddleware'.
// Se o seu ficheiro tiver outro nome, por favor, ajuste o 'require' e o uso abaixo.
const authMiddleware = require('../middlewares/auth.middleware');

// Agora, ambas as rotas estão protegidas. O middleware irá adicionar
// as informações do utilizador logado (req.user) a cada pedido.
router.get('/', authMiddleware, conversaController.getConversas);
router.post('/enviar', authMiddleware, conversaController.enviarMensagem);

module.exports = router;
