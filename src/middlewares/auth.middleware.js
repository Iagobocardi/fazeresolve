// Arquivo: src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // VAMOS VER O QUE O SERVIDOR ESTÁ REALMENTE A RECEBER
    console.log('[DEBUG-AUTH] Query Params Recebidos:', JSON.stringify(req.query));
    console.log('[DEBUG-AUTH] Cabeçalho de Autorização:', req.headers['authorization']);
// 1. Obter o token do cabeçalho da requisição ou da query string
    let token;
    const authHeader = req.headers['authorization'];

    // Verifique primeiro se há token no cabeçalho
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Se não houver token no cabeçalho, verifique a string de consulta como fallback
    if (!token && req.query.token) {
        token = req.query.token;
    }

    // 2. Verificar se o token existe
    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    try {
        // 3. Verificar a validade do token com a sua chave secreta
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Verificar o status do utilizador
        if (decoded.status !== 'ATIVO') {
            return res.status(403).json({ message: 'Acesso negado. A sua conta não está ativa.' });
        }

        // 5. Anexar os dados do utilizador (do token) à requisição para uso posterior
        req.user = decoded; 

        next(); // Se tudo estiver correto, prossegue para a próxima função (o controller)
    } catch (error) {
        res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};

// Exporta a própria função de middleware, que é o que a rota espera.
module.exports = authMiddleware;
