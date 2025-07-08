// Arquivo: src/routes/auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Rota para o login de clientes
router.post('/login', authController.loginCliente);

module.exports = router;