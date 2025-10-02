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

        // 2. Busca o usuário e popula a conta associada para obter o plano.
        const usuario = await Usuario.findById(decoded.id).populate('contaId');

        if (!usuario) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }
        
        if (!usuario.contaId) {
            return res.status(401).json({ message: 'Conta associada ao usuário não encontrada.' });
        }

        // 3. Cria um objeto de usuário plano e anexa as informações necessárias, incluindo o plano.
        const userObject = usuario.toObject();
        userObject.id = usuario.id; // Garante que o ID virtual seja incluído
        userObject.plano = usuario.contaId.plano; // Anexa o plano da conta ao objeto do usuário

        req.user = userObject; // Anexa o objeto modificado à requisição

        next();
    } catch (error) {
        res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};

module.exports = authMiddleware;
