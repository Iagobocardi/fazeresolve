const express = require('express');
const router = express.Router();
const pixController = require('../controllers/pix.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');

router.post(
    '/charge',
    authMiddleware,
    pixController.createPixCharge
);

module.exports = router;
