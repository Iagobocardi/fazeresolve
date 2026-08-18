const express = require('express');
const router = express.Router();
const googleController = require('../controllers/google.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rota para criar um novo evento no Google Calendar.
// Apenas utilizadores autenticados podem aceder.
router.post('/create-event', authMiddleware, googleController.createEvent);

// Aqui pode adicionar outras rotas relacionadas ao Google no futuro
// Ex: router.get('/list-events', authMiddleware, googleController.listEvents);
// --- 👇 NOVA ROTA PARA BUSCAR IMAGENS 👇 ---
router.post('/search-image', googleController.searchImage);

module.exports = router;