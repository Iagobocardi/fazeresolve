// src/routes/auth.routes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller.js');

// Rota para o login de utilizadores do sistema (Admin, etc.)
router.post('/login', authController.loginUser);

// Rota para o login de clientes do portal
router.post('/portal/login', authController.loginCliente);


module.exports = router;