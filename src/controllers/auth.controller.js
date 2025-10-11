// Arquivo: src/controllers/auth.controller.js
const Usuario = require('../models/usuario.model'); // MUDANÇA: Usa o modelo Usuario
const Conta = require('../models/conta.model');   // MUDANÇA: Usa o novo modelo Conta
const PasswordReset = require('../models/passwordReset.model');
const authService = require('../services/auth.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ message: 'Identificador (email ou telefone) e senha são obrigatórios.' });
        }

        // 1. Encontra o usuário pelo email ou telefone
        const usuario = await Usuario.findOne({
            $or: [{ email: identifier }, { telefone: identifier }]
        }).select('+password');

        if (!usuario) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // 2. Compara a senha
        const isMatch = await bcrypt.compare(password, usuario.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }
        
        // 3. Busca a conta associada para verificar o status
        const conta = await Conta.findById(usuario.contaId);
        if (!conta) {
            return res.status(404).json({ message: 'Conta associada não encontrada.' });
        }

        // 4. VERIFICAÇÃO DE PAGAMENTO PENDENTE
        if (conta.statusAssinatura === 'AGUARDANDO_PAGAMENTO') {
            console.log(`[Login] Usuário ${usuario.email} tem pagamento pendente. Gerando token provisório.`);
            // Gera um token provisório para que o usuário possa completar o pagamento
            const payload = {
                id: usuario._id,
                contaId: conta._id,
                statusAssinatura: conta.statusAssinatura
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });

            // Retorna uma resposta especial para o frontend
            return res.status(202).json({
                message: 'Pagamento pendente. Por favor, complete sua assinatura.',
                needs_payment: true,
                token: token,
                usuario: { id: usuario._id, email: usuario.email },
                conta: conta
            });
        }

        // 5. Gera um token JWT definitivo para o usuário com assinatura ativa
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
            userType: 'provider',
            usuario: {
                id: usuario._id,
                nome: usuario.nome,
                email: usuario.email,
                role: usuario.role,
                plano: conta.plano,
                statusAssinatura: conta.statusAssinatura,
                permissoes: usuario.permissoes
            },
            conta: conta
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
        const { nomeEmpresa, nome, email, telefone, password, planoId, cpf, cnpj } = req.body; // Adicionado cpf e cnpj

        // Checa se o usuário já existe
        const existingUser = await Usuario.findOne({ $or: [{ email: email }, { telefone: telefone }] });
        if (existingUser) {
            const conta = await Conta.findById(existingUser.contaId);
            if(conta && conta.statusAssinatura !== 'AGUARDANDO_PAGAMENTO') {
                return res.status(409).json({ message: 'Um usuário com este email ou telefone já existe.' });
            }
        }
        
        // --- Lógica para associar plano e permissões ---
        const PLANS = require('../config/plans.config.js');
        let selectedPlan = null;

        // Procura o ID tanto nos planos mensais quanto nos anuais
        for (const plan of PLANS) {
            if (plan.monthly.id === planoId || plan.annual.id === planoId) {
                selectedPlan = plan;
                break;
            }
        }

        if (!selectedPlan) {
            return res.status(400).json({ message: 'Plano inválido ou não reconhecido.' });
        }

        // 1. Cria a nova Conta, adicionando o CNPJ se ele for fornecido
        const companyInfo = {
            nomeFantasia: nomeEmpresa || nome,
            razaoSocial: nomeEmpresa || nome,
        };
        if (cnpj) {
            companyInfo.cnpj = cnpj;
        }

        const novaConta = new Conta({
            nome: nomeEmpresa || nome,
            plano: selectedPlan.name,
            planId: planoId,
            companyInfo: companyInfo
        });
        await novaConta.save();

        // 2. Cria o novo Usuário, adicionando o CPF se ele for fornecido
        const userData = {
            nome,
            email,
            telefone,
            password,
            contaId: novaConta._id,
            role: 'Dono',
            permissoes: selectedPlan.permissions
        };
        if (cpf) {
            userData.cpf = cpf;
        }

        const novoUsuario = new Usuario(userData);
        await novoUsuario.save();

        // 3. Gera o token JWT provisório
        const payload = {
            id: novoUsuario._id,
            contaId: novaConta._id,
            statusAssinatura: novaConta.statusAssinatura
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Aumentado para 1 hora para dar tempo suficiente para o pagamento
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

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await Usuario.findOne({ email });

        if (user) {
            await authService.createAndSendPasswordReset(user);
        }

        res.status(200).json({ message: 'Se um usuário com este email existir, um link para redefinição de senha será enviado.' });
    } catch (error) {
        console.error("Erro ao solicitar redefinição de senha:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
        }

        const resetRequest = await PasswordReset.findOne({ token: token });

        if (!resetRequest || resetRequest.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }

        const user = await Usuario.findById(resetRequest.userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        user.password = password; // O hash é feito pelo middleware pré-save do Mongoose
        await user.save();

        await PasswordReset.deleteOne({ _id: resetRequest._id });

        res.status(200).json({ message: 'Senha redefinida com sucesso.' });
    } catch (error) {
        console.error("Erro ao redefinir a senha:", error);
        res.status(500).json({ message: 'Erro interno no servidor ao redefinir a senha.' });
    }
};

const checkExistingRegistration = async (req, res) => {
    try {
        const { identifier } = req.body;

        if (!identifier) {
            return res.status(400).json({ message: 'Identificador (email ou telefone) é obrigatório.' });
        }

        const usuario = await Usuario.findOne({
            $or: [{ email: identifier }, { telefone: identifier }]
        });

        if (!usuario) {
            return res.status(200).json({ pending_registration: false });
        }

        const conta = await Conta.findById(usuario.contaId);

        if (conta && conta.statusAssinatura === 'AGUARDANDO_PAGAMENTO') {
            const payload = {
                id: usuario._id,
                contaId: conta._id,
                statusAssinatura: conta.statusAssinatura
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            return res.status(200).json({
                pending_registration: true,
                message: 'Registro pendente encontrado. Prossiga para o pagamento.',
                token,
                usuario: { 
                    id: usuario._id, 
                    nome: usuario.nome, 
                    email: usuario.email,
                    telefone: usuario.telefone,
                    cpf: usuario.cpf
                },
                conta: {
                    id: conta._id,
                    nome: conta.nome,
                    plano: conta.plano,
                    planId: conta.planId,
                    companyInfo: conta.companyInfo
                }
            });
        }

        return res.status(200).json({ pending_registration: false });

    } catch (error) {
        console.error("Erro ao verificar registro existente:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};


module.exports = {
    login,
    register,
    handleGoogleCallback,
    iniciarAuthGoogle,
    forgotPassword,
    resetPassword,
    checkExistingRegistration,
};
