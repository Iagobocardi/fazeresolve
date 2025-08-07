// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller.js');

// Este ficheiro deve conter apenas rotas de autenticação
router.post('/login', authController.loginCliente);

module.exports = router;