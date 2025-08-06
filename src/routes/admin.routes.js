// Em: src/routes/admin.routes.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

// Rota: POST /api/admin/login
router.post('/login', adminController.loginAdmin);
router.get('/me', authMiddleware, adminController.getMe); 
module.exports = router;