// In: src/routes/whatsappTemplates.routes.js
const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const checkPlan = require('../middlewares/checkPlan.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware');

// Aplica o middleware de autenticação e verificação de função a todas as rotas
router.use(authMiddleware);
router.use(roleMiddleware(['Dono', 'ADMIN']));

// Rota para obter as variáveis de template disponíveis
router.get('/variables', whatsappController.getAvailableVariables);

// Rota para renderizar um preview de um template
router.post('/preview', whatsappController.renderPreview);

router.get('/', whatsappController.getAllTemplates);
router.get('/render/:templateId/:orcamentoId', whatsappController.renderTemplate);

// Admin-only routes
router.post('/', checkPlan(['Premium']), whatsappController.createTemplate);
router.put('/:id', whatsappController.updateTemplate);
router.delete('/:id', whatsappController.deleteTemplate);

module.exports = router;
