// Em: src/controllers/admin.controller.js

const Cliente = require('../models/cliente.model');
const Subscription = require('../models/subscription.model.js');
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

exports.ativarUsuario = async (req, res) => {
    try {
        const { userId } = req.params;

        const usuario = await Cliente.findById(userId);

        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        // Altera o status e adiciona um ID de assinatura manual
        usuario.status = 'ATIVO';
        usuario.mercadoPagoSubscriptionId = `manual-${userId}`;
        await usuario.save();

        // Adicionado: Cria uma assinatura manual para o usuário
        // Verifica se já não existe uma, para evitar erros de duplicação
        const existingSubscription = await Subscription.findOne({ userId: userId });
        if (!existingSubscription) {
            if (!usuario.planId) {
                return res.status(400).json({ message: 'Usuário não tem um planId definido. Não é possível criar a assinatura.' });
            }
            const novaAssinatura = new Subscription({
                userId: userId,
                planId: usuario.planId, // Pega o planId do usuário
                subscriptionId: `manual-${userId}`, // Gera um ID único
                status: 'authorized',
                lastPaymentDate: new Date(),
                nextPaymentDate: new Date(new Date().setFullYear(new Date().getFullYear() + 99)) // Data de expiração longa
            });
            await novaAssinatura.save();
        }

        res.status(200).json({ message: 'Usuário ativado e assinatura manual criada com sucesso!', usuario });

    } catch (error) {
        console.error("ERRO ao ativar usuário:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};
