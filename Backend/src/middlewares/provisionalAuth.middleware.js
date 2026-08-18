const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');
const Conta = require('../models/conta.model');

const provisionalAuthMiddleware = async (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido ou mal formatado.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('[Auth Provisório] Procurando por usuário com ID do token:', decoded.id);

        let usuario, conta;
        try {
            usuario = await Usuario.findById(decoded.id);
            console.log('[Auth Provisório] Busca de usuário concluída. Usuário encontrado:', !!usuario);

            if (usuario) {
                conta = await Conta.findById(usuario.contaId);
                console.log('[Auth Provisório] Busca de conta concluída. Conta encontrada:', !!conta);
            }
        } catch (dbError) {
            console.error('[Auth Provisório] Erro de comunicação com o banco de dados:', dbError);
            return res.status(503).json({ message: 'Erro de serviço. Não foi possível conectar ao banco de dados.' });
        }

        if (!usuario) {
            return res.status(401).json({ message: 'Usuário do token não encontrado.' });
        }

        if (!conta) {
            return res.status(401).json({ message: 'Conta associada ao usuário não encontrada.' });
        }

        if (conta.statusAssinatura !== 'AGUARDANDO_PAGAMENTO') {
            return res.status(403).json({ message: 'Acesso negado. Esta rota é apenas para utilizadores com pagamento pendente.' });
        }

        req.user = usuario;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expirado. Por favor, inicie o processo de registo novamente.' });
        }
        return res.status(401).json({ message: 'Token inválido.' });
    }
};

module.exports = provisionalAuthMiddleware;
