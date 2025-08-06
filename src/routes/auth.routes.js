// src/routes/auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller.js');

// Rota para o login de clientes (já existente)
router.post('/login', authController.loginCliente);

module.exports = router;