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

        // 1. VERIFICAÇÃO DE PERFIL (ROLE)
        if (!['PRESTADOR', 'ADMIN'].includes(decoded.role)) {
            return res.status(403).json({ message: 'Acesso proibido. Permissões insuficientes.' });
        }

        // 2. VERIFICAÇÃO DE STATUS (NOVA)
        // Bloqueia o acesso se a conta ainda estiver pendente de pagamento
        if (decoded.status === 'PENDENTE') {
            return res.status(403).json({ message: 'A sua conta está pendente de confirmação de pagamento.' });
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