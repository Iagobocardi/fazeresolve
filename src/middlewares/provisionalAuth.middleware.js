const jwt = require('jsonwebtoken');

const provisionalAuthMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido ou mal formatado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.status !== 'AGUARDANDO_PAGAMENTO') {
            return res.status(403).json({ message: 'Acesso negado. Esta rota é apenas para utilizadores com pagamento pendente.' });
        }

        req.user = { id: decoded.id, status: decoded.status };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expirado. Por favor, inicie o processo de registo novamente.' });
        }
        return res.status(401).json({ message: 'Token inválido.' });
    }
};

module.exports = provisionalAuthMiddleware;
