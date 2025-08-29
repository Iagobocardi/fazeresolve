const jwt = require('jsonwebtoken');
const Cliente = require('../models/cliente.model');
const Conta = require('../models/conta.model');

const authCliente = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    try {
        // 1. Decodifica o token para obter o ID do cliente
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 2. Busca o cliente no banco de dados
        const cliente = await Cliente.findById(decoded.id);
        if (!cliente) {
            return res.status(401).json({ message: 'Cliente não encontrado.' });
        }

        // 3. Busca a conta principal para verificar a assinatura
        const conta = await Conta.findById(cliente.contaId);
        if (!conta) {
            return res.status(403).json({ message: 'Acesso negado. Conta principal não encontrada.' });
        }

        // 4. Verifica se a assinatura da conta principal está ativa
        if (conta.statusAssinatura !== 'ATIVO') {
            return res.status(403).json({ message: 'Acesso negado. A assinatura do prestador de serviço não está ativa.' });
        }

        // 5. Anexa os dados atualizados do cliente à requisição
        req.cliente = cliente;

        next();
    } catch (error) {
        res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};

module.exports = authCliente;
