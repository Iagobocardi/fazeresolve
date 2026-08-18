// Arquivo: src/middlewares/error.middleware.js
// Middleware para tratamento de erros global
const errorMiddleware = (err, req, res, next) => {
    console.error('Erro global:', err);

    if (err.name === 'ValidationError') {
        // Erros de validação do Mongoose
        const errors = Object.values(err.errors).map(el => el.message);
        res.status(400).json({ error: 'Erro de validação', details: errors });
    } else if (err.name === 'CastError') {
         // Erros de casting de ID do Mongoose
        res.status(400).json({ error: 'ID inválido', details: err.message });
    }
     else {
        // Erros genéricos
        res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
    }
};

module.exports = errorMiddleware;
