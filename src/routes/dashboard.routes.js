// Arquivo: src/routes/dashboard.routes.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller.js');

// Rota única para todos os dados da visão geral
router.get('/', dashboardController.getDashboardData); 

module.exports = router;