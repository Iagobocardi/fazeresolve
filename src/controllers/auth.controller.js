// Arquivo: src/controllers/auth.controller.js
const Usuario = require('../models/usuario.model');
const Cliente = require('../models/cliente.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Função de Login para Utilizadores do Sistema (Admin, etc.)
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }

        const user = await Usuario.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const payload = {
            id: user._id,
            nome: user.nome,
            plano: user.plano // Importante para o middleware checkPlan
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        user.password = undefined;

        res.status(200).json({
            message: 'Login bem-sucedido!',
            token,
            user
        });

    } catch (error) {
        console.error("ERRO em loginUser:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};


// Função de Login para Clientes do Portal
const loginCliente = async (req, res) => {
    try {
        const { telefone, password } = req.body;

        if (!telefone || !password) {
            return res.status(400).json({ message: 'Telefone e senha são obrigatórios.' });
        }

        const cliente = await Cliente.findOne({ telefone: telefone }).select('+password');

        if (!cliente) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const isMatch = await bcrypt.compare(password, cliente.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const payload = {
            id: cliente._id,
            nome: cliente.nome,
            role: cliente.role
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

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
    loginUser,
    loginCliente,
};