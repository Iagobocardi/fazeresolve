// Arquivo: src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // 1. Obter o token do cabeçalho da requisição
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    // 2. Verificar se o token existe
    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    try {
        // 3. Verificar a validade do token com a sua chave secreta
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Anexar os dados do utilizador (do token) à requisição para uso posterior
        // O seu controller de conversa espera req.user, então usamos esse nome.
        req.user = decoded; 

        next(); // Se tudo estiver correto, prossegue para a próxima função (o controller)
    } catch (error) {
        res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};

// Exporta a própria função de middleware, que é o que a rota espera.
module.exports = authMiddleware;