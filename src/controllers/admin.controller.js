// Em: src/controllers/admin.controller.js

const Cliente = require('../models/cliente.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.loginAdmin = async (req, res) => {
    try {
        const { login, password } = req.body;

        if (!login || !password) {
            return res.status(400).json({ message: 'Login e senha são obrigatórios.' });
        }

        // Busca o utilizador pelo telefone OU email, que seja PRESTADOR ou ADMIN
        let usuario = await Cliente.findOne({ telefone: login, role: { $in: ['PRESTADOR', 'ADMIN'] } }).select('+password +plano');
        if (!usuario) {
            usuario = await Cliente.findOne({ email: login, role: { $in: ['PRESTADOR', 'ADMIN'] } }).select('+password +plano');
        }

        // Adicionado para depuração
        console.log('DEBUG: Utilizador encontrado na base de dados:', usuario);

        if (!usuario) {
            return res.status(401).json({ message: 'Credenciais inválidas ou conta não é de administrador.' });
        }

        const isMatch = await bcrypt.compare(password, usuario.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // --- A CORREÇÃO PRINCIPAL ESTÁ AQUI ---
        // Agora, lemos o plano diretamente do 'usuario' que veio do banco de dados.
        const payload = {
            id: usuario._id,
            nome: usuario.nome,
            role: usuario.role,
            plano: usuario.plano // <-- USA O PLANO REAL DO BANCO DE DADOS
        };
        // ------------------------------------

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            message: 'Login de administrador bem-sucedido!',
            token,
            usuario: payload // Enviamos o payload que contém o plano real
        });

    } catch (error) {
        console.error("ERRO no login do admin:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// Não se esqueça de adicionar a função getMe se ela não existir
exports.getMe = async (req, res) => {
    // O middleware de autenticação já colocou os dados do token em req.user
    res.status(200).json(req.user);
};
