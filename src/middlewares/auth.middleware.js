// Arquivo: src/middlewares/validation.middleware.js
const { validationResult } = require('express-validator');

// Middleware para validar os resultados do express-validator
exports.validate = (req, res,next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};
