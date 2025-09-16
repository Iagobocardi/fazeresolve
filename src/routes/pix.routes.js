const express = require('express');
const router = express.Router();
const pixController = require('../controllers/pix.controller.js');
const provisionalAuthMiddleware = require('../middlewares/provisionalAuth.middleware.js');

router.post(
    '/charge',
    provisionalAuthMiddleware,
    pixController.createPixCharge
);

module.exports = router;
