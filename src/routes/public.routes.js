// Arquivo: src/routes/public.routes.js

const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Rota pública que usa o publicId para buscar um pedido
router.get('/pedido/:publicId', publicController.getPedidoByPublicId);

module.exports = router;