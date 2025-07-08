const jwt = require('jsonwebtoken');

const authCliente = (req, res, next) => {
    // 1. Pega o token do cabeçalho da requisição
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    // 2. Verifica se o token existe
    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    try {
        console.log('Verificando token com segredo:', process.env.JWT_SECRET); // Adicione esta linha
        // 3. Verifica se o token é válido
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use a sua chave secreta

        // 4. Anexa os dados do cliente (do token) à requisição para uso posterior
        req.cliente = decoded; 

        next(); // Tudo certo, pode prosseguir para a rota
    } catch (error) {
        res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};

module.exports = authCliente;