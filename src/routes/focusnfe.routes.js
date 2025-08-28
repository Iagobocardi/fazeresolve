// src/routes/focusnfe.routes.js
const express = require('express');
const router = express.Router();
const focusnfeController = require('../controllers/focusnfe.controller.js');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Protege todas as rotas neste arquivo
router.use(authMiddleware);
router.use(roleMiddleware(['PRESTADOR', 'ADMIN']));

// Rota para salvar e validar o token da Focus NFe
// POST /api/focusnfe/token
router.post('/token', focusnfeController.saveToken);

// Rota para remover a conexão com a Focus NFe
// DELETE /api/focusnfe/token
router.delete('/token', focusnfeController.disconnectToken);

module.exports = router;
