// Arquivo: src/controllers/auth.controller.js
const Usuario = require('../models/usuario.model'); // MUDANÇA: Usa o modelo Usuario
const Conta = require('../models/conta.model');   // MUDANÇA: Usa o novo modelo Conta
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const { google } = require('googleapis');

const iniciarAuthGoogle = (req, res) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/calendar'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: req.user.id // Passa o ID do usuário para o callback
    });

    res.redirect(url);
};

const handleGoogleCallback = async (req, res) => {
    try {
        const { code, state } = req.query;
        const userId = state; // ID do usuário passado no estado

        if (!code || !userId) {
            return res.status(400).redirect('/error?message=Código ou ID do usuário ausente.');
        }
        
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Buscar informações do usuário do Google
        const googleUser = await google.oauth2({ version: 'v2', auth: oauth2Client }).userinfo.get();
        const googleId = googleUser.data.id;
        const googleEmail = googleUser.data.email;
        
        // Verificar se outra conta já está usando este Google ID
        const existingGoogleUser = await Usuario.findOne({ googleId: googleId });
        if (existingGoogleUser && existingGoogleUser._id.toString() !== userId) {
            // Idealmente, redirecionar para uma página de erro no frontend
            return res.status(409).send('Esta conta do Google já está associada a outro usuário.');
        }

        // Encontrar o usuário pelo ID e atualizar com os dados do Google
        const updatedUser = await Usuario.findByIdAndUpdate(userId, {
            googleId: googleId,
            googleTokens: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
            },
            // Se o email do usuário no nosso sistema estiver vazio ou for o mesmo, atualiza.
            // Isso previne que um usuário troque seu email de login por um do Google.
            // A lógica pode ser ajustada conforme a regra de negócio.
            email: (await Usuario.findById(userId)).email || googleEmail,
        }, { new: true });

        if (!updatedUser) {
            // Redirecionar para uma página de erro no frontend
            return res.status(404).send('Usuário não encontrado para associar a conta Google.');
        }

        // Redirecionar para uma página de sucesso no frontend.
        // O frontend pode então fechar a janela popup e atualizar a UI.
        res.redirect(process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/integrations?google_auth_status=success` : '/');

    } catch (error) {
        console.error('Erro no callback do Google:', error);
        // Redirecionar para uma página de erro no frontend
        res.redirect(process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/integrations?google_auth_status=error` : '/error');
    }
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
        console.log(`[Login] Tentando comparar senha para ${usuario.email}.`);
        console.log(`[Login] Senha recebida: ${password}`);
        console.log(`[Login] Hash do banco: ${usuario.password}`);
        const isMatch = await bcrypt.compare(password, usuario.password);
        console.log(`[Login] Resultado da comparação: ${isMatch}`);

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
            userType: 'provider', // Adiciona o sinalizador para o frontend
            usuario: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role,
                plano: conta.plano,
                statusAssinatura: conta.statusAssinatura,
                permissoes: usuario.permissoes
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
        console.log('--- DEBUG: Registration Request Body ---');
        console.log(req.body);
        const { nomeEmpresa, nome, email, password, planoId } = req.body;

        // Checa se o usuário já existe
        const existingUser = await Usuario.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Um usuário com este email já existe.' });
        }
        
        // --- Lógica para associar plano e permissões ---
        const PLANS = require('../config/plans.config.js');
        const selectedPlan = PLANS.find(p => p.id === planoId);

        if (!selectedPlan) {
            return res.status(400).json({ message: 'Plano inválido ou não reconhecido.' });
        }

        // 1. Cria a nova Conta
        const novaConta = new Conta({
            nome: nomeEmpresa || nome, // Usa o nome da empresa ou o nome do usuário
            plano: selectedPlan.name, // Define o nome do plano na conta
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
            role: 'Dono', // O primeiro usuário é sempre o Dono
            permissoes: selectedPlan.permissions // Atribui as permissões com base no plano
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
