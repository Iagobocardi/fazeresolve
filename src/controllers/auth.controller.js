// Arquivo: src/controllers/auth.controller.js
const Usuario = require('../models/usuario.model'); // MUDANÇA: Usa o modelo Usuario
const Conta = require('../models/conta.model');   // MUDANÇA: Usa o novo modelo Conta
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// A lógica do Google Auth precisará ser refatorada separadamente,
// pois depende da estrutura antiga. Mantendo por enquanto para não quebrar.
const { google } = require('googleapis');
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:3000/api/auth/google/callback`
);
const iniciarAuthGoogle = (req, res) => {
    // Esta função precisará ser adaptada para o novo modelo de usuário/conta
    res.status(501).json({ message: "Google Auth a ser reimplementado."})
};
const handleGoogleCallback = async (req, res) => {
    // Esta função precisará ser adaptada para o novo modelo de usuário/conta
    res.status(501).json({ message: "Google Auth a ser reimplementado."})
};


// MUDANÇA: Função de Login agora para Usuario
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }

        // 1. Encontra o usuário pelo email
        const usuario = await Usuario.findOne({ email }).select('+password');

        if (!usuario) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // 2. Compara a senha
        const isMatch = await bcrypt.compare(password, usuario.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // 3. Busca a conta associada para adicionar ao token
        const conta = await Conta.findById(usuario.contaId);
        if (!conta) {
             return res.status(404).json({ message: 'Conta associada não encontrada.' });
        }

        // 4. Gera um token JWT minimalista, contendo apenas o ID do usuário.
        // O middleware de autenticação se encarregará de buscar os dados atualizados a cada requisição.
        const payload = {
            id: usuario._id
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login bem-sucedido!',
            token,
            usuario: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role
            },
            conta: conta // Retorna os dados da conta também
        });

    } catch (error) {
        console.error("ERRO no login:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

// MUDANÇA: Função de Registro agora cria Conta e Usuario
const register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { nomeEmpresa, nome, email, password, planoId } = req.body;

        // Checa se o usuário já existe
        const existingUser = await Usuario.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Um usuário com este email já existe.' });
        }

        // 1. Cria a nova Conta
        const novaConta = new Conta({
            nome: nomeEmpresa || nome, // Usa o nome da empresa ou o nome do usuário
            planId: planoId,
            companyInfo: {
                nomeFantasia: nomeEmpresa || nome,
                razaoSocial: nomeEmpresa || nome,
            }
        });
        await novaConta.save();

        // 2. Cria o novo Usuário, associado à conta
        const novoUsuario = new Usuario({
            nome,
            email,
            password, // O pre-save hook no modelo irá encriptar
            contaId: novaConta._id, // Associa o usuário à nova conta
            role: 'Dono' // O primeiro usuário é sempre o Dono
        });
        await novoUsuario.save();
        console.log('[Registro] Usuário criado com ID:', novoUsuario._id); // <-- LOG DE DIAGNÓSTICO

        // 3. Gera o token JWT provisório
        const payload = {
            id: novoUsuario._id,
            contaId: novaConta._id,
            statusAssinatura: novaConta.statusAssinatura
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.status(201).json({
            message: 'Conta e usuário registrados com sucesso! Aguardando pagamento.',
            token,
            usuario: { id: novoUsuario._id, nome: novoUsuario.nome, email: novoUsuario.email },
            conta: novaConta
        });

    } catch (error) {
        console.error("Erro ao registrar:", error);
        res.status(500).json({ message: 'Ocorreu um erro interno ao tentar registrar.' });
    }
};

module.exports = {
    login, // MUDANÇA: exporta a nova função de login
    register,
    // Mantendo as rotas do google por enquanto, mas desabilitadas
    handleGoogleCallback,
    iniciarAuthGoogle,
};
