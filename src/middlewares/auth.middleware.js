const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

const authMiddleware = async (req, res, next) => {
    // Permite que as requisições OPTIONS passem sem autenticação (importante para o CORS)
    if (req.method === 'OPTIONS') {
        return next();
    }

    let token;
    const authHeader = req.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    try {
        // 1. Decodifica o token para obter o ID do usuário
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 2. Busca o usuário no banco de dados para obter os dados mais recentes
        // Isso garante que as permissões e roles estejam sempre atualizadas.
        const usuario = await Usuario.findById(decoded.id);

        if (!usuario) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }

        // 3. Anexa o objeto de usuário completo (e atualizado) à requisição
        req.user = usuario;

        next();
    } catch (error) {
        res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};

module.exports = authMiddleware;
