// Arquivo: src/controllers/auth.controller.js

const Cliente = require('../models/cliente.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Função de Login
const loginCliente = async (req, res) => {
    try {
        const { telefone, password } = req.body;

        // 1. Verifica se o telefone e a senha foram enviados
        if (!telefone || !password) {
            return res.status(400).json({ message: 'Telefone e senha são obrigatórios.' });
        }

        // 2. Encontra o cliente pelo telefone e, crucialmente, seleciona o campo 'password'
        // que por padrão não é retornado.
        const cliente = await Cliente.findOne({ telefone: telefone }).select('+password');

        if (!cliente) {
            return res.status(401).json({ message: 'Credenciais inválidas.' }); // Mensagem genérica por segurança
        }

        // 3. Compara a senha enviada com a senha criptografada no banco de dados
        const isMatch = await bcrypt.compare(password, cliente.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // 4. Se a senha estiver correta, gera um token JWT
        const payload = {
            id: cliente._id,
            nome: cliente.nome,
            role: cliente.role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // Uma chave secreta que vamos adicionar ao .env
            { expiresIn: '1d' }    // O token expira em 1 dia
        );

        // Remove a senha do objeto antes de o enviar de volta
        cliente.password = undefined;

        res.status(200).json({
            message: 'Login bem-sucedido!',
            token,
            cliente
        });

    } catch (error) {
        console.error("ERRO em loginCliente:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};


module.exports = {
    loginCliente,
};