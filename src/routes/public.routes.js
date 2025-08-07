// src/routes/public.routes.js

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Rota para obter o status de um pedido (já existente)
router.get('/pedidos/:publicId', publicController.getPedidoByPublicId);

// --- NOVAS ROTAS ADICIONADAS ---

// Rota para APROVAR um orçamento
router.post('/pedidos/:publicId/aprovar', publicController.aprovarOrcamentoPublico);

// Rota para REJEITAR um orçamento
router.post('/pedidos/:publicId/rejeitar', publicController.rejeitarOrcamentoPublico);

// Rota para SUGERIR/REAGENDAR um agendamento
router.patch('/pedidos/:publicId/sugerir-agendamento', publicController.sugerirAgendamentoPublico);


module.exports = router;
