// Arquivo: src/middlewares/adminAuth.middleware.js

const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
    // Primeiro, verificamos a autenticação (se o token é válido)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // AGORA, A VERIFICAÇÃO DE AUTORIZAÇÃO (A CORREÇÃO)
        // Verificamos se a "função" (role) do utilizador é 'PRESTADOR'
        if (decoded.role !== 'PRESTADOR') {
            // Se não for, devolvemos o erro 403 Forbidden
            return res.status(403).json({ message: 'Acesso proibido. Permissões insuficientes.' });
        }

        // Se tudo estiver correto, anexa os dados do utilizador à requisição e continua
        req.user = decoded;
        next();

    } catch (error) {
        // Se o token for inválido por qualquer outro motivo (expirado, etc.)
        return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};

module.exports = adminAuth;