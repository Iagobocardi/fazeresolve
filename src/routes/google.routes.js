const express = require('express');
const router = express.Router();
const googleController = require('../controllers/google.controller');

// Rota para criar um novo evento no Google Calendar
// POST /api/google/create-event
router.post('/create-event', googleController.createEvent);

// Aqui pode adicionar outras rotas relacionadas ao Google no futuro
// Ex: router.get('/list-events', googleController.listEvents);
// --- 👇 NOVA ROTA PARA BUSCAR IMAGENS 👇 ---
router.post('/search-image', googleController.searchImage);

module.exports = router;
