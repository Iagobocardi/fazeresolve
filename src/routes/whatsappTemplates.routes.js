// In: src/routes/whatsappTemplates.routes.js
const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const checkPlan = require('../middlewares/checkPlan.middleware.js');

router.get('/', whatsappController.getAllTemplates);
router.get('/render/:templateId/:orcamentoId', whatsappController.renderTemplate);

// Admin-only routes
router.post('/', authMiddleware, checkPlan(['Admin']), whatsappController.createTemplate);
router.put('/:id', authMiddleware, checkPlan(['Admin']), whatsappController.updateTemplate);
router.delete('/:id', authMiddleware, checkPlan(['Admin']), whatsappController.deleteTemplate);

module.exports = router;