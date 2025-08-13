// src/controllers/public.controller.js

const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');

const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Instancia o cliente OAuth2 para a troca de código
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage' // Essencial para o fluxo de "one-time code" do frontend
);

const googleLogin = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'O código de autorização do Google é obrigatório.' });
        }

        // Troca o código por tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Obtém as informações do perfil do utilizador
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();

        // Procura um utilizador na base de dados com o email do Google
        const usuario = await Cliente.findOne({ email: data.email });

        // Se o utilizador não for encontrado, retorna um erro
        if (!usuario) {
            return res.status(404).json({ message: 'Utilizador não encontrado. Por favor, registe-se primeiro.' });
        }

        // Se o utilizador for encontrado, gera um token JWT para ele
        const payload = {
            id: usuario._id,
            nome: usuario.nome,
            role: usuario.role,
            plano: usuario.plano
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            message: 'Login com Google bem-sucedido!',
            token,
            usuario: payload
        });

    } catch (error) {
        console.error("Erro no login com Google:", error);
        res.status(500).json({ message: 'Ocorreu um erro interno durante o login com o Google.' });
    }
};

const registerProvider = async (req, res) => {
    // Lida com os erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { nome, email, telefone, password, plano } = req.body;

        // Adicionado para depuração
        console.log(`DEBUG: Tentativa de registo com a senha: "${password}"`);

        // Checa se o utilizador já existe
        const existingUser = await Cliente.findOne({ $or: [{ email: email }, { telefone: telefone }] });
        if (existingUser) {
            return res.status(409).json({ message: 'Um utilizador com este email ou telefone já existe.' });
        }

        // Cria o novo prestador
        const novoPrestador = new Cliente({
            nome,
            email,
            telefone,
            password, // O pre-save hook no modelo irá encriptar
            plano,
            role: 'PRESTADOR' // Define a função como PRESTADOR
        });

        await novoPrestador.save();

        // Remove a senha do objeto antes de o enviar de volta
        const prestadorParaRetornar = novoPrestador.toObject();
        delete prestadorParaRetornar.password;

        res.status(201).json({ message: 'Prestador registado com sucesso!', usuario: prestadorParaRetornar });

    } catch (error) {
        console.error("Erro ao registrar novo prestador:", error);
        res.status(500).json({ message: 'Ocorreu um erro interno ao tentar registar o prestador.' });
    }
};

const getPedidoByPublicId = async (req, res) => {
    try {
        const pedido = await Orcamento.findOne({ publicId: req.params.publicId }).populate('cliente', 'nome');
        if (!pedido) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        res.status(200).json(pedido);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar o pedido.' });
    }
};

const aprovarOrcamentoPublico = async (req, res) => {
    try {
        const orcamento = await Orcamento.findOne({ publicId: req.params.publicId });
        if (!orcamento || orcamento.status !== 'Pendente') {
            return res.status(400).json({ message: 'Este orçamento não pode ser aprovado.' });
        }

        orcamento.status = 'Aceito';
        orcamento.historico.push({ evento: 'Orçamento aprovado pelo cliente via link público.' });
        await orcamento.save();
        res.status(200).json({ message: 'Orçamento aprovado com sucesso!', orcamento });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao aprovar o orçamento.' });
    }
};

const rejeitarOrcamentoPublico = async (req, res) => {
    try {
        const orcamento = await Orcamento.findOne({ publicId: req.params.publicId });
        if (!orcamento || orcamento.status !== 'Pendente') {
            return res.status(400).json({ message: 'Este orçamento não pode ser rejeitado.' });
        }

        orcamento.status = 'Rejeitado';
        orcamento.historico.push({ evento: 'Orçamento rejeitado pelo cliente via link público.' });
        await orcamento.save();
        res.status(200).json({ message: 'Orçamento rejeitado com sucesso.', orcamento });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao rejeitar o orçamento.' });
    }
};

const sugerirAgendamentoPublico = async (req, res) => {
    try {
        const { dataSugerida } = req.body;
        const orcamento = await Orcamento.findOne({ publicId: req.params.publicId });
        
        if (!orcamento || !['Aceito', 'Agendado'].includes(orcamento.status)) {
            return res.status(400).json({ message: 'Não é possível sugerir um agendamento para este pedido agora.' });
        }

        orcamento.sugestaoAgendamentoCliente = dataSugerida;
        const isReagendamento = orcamento.status === 'Agendado';
        orcamento.historico.push({
            evento: isReagendamento
                ? `Cliente solicitou reagendamento via link público para: ${dataSugerida}`
                : `Cliente sugeriu agendamento via link público para: ${dataSugerida}`
        });
        await orcamento.save();
        res.status(200).json({ message: 'Sugestão de agendamento enviada com sucesso.', orcamento });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao enviar sugestão de agendamento.' });
    }
};

// --- CORREÇÃO APLICADA AQUI ---
// O module.exports agora exporta apenas as funções que existem neste ficheiro.
module.exports = {
    getPedidoByPublicId,
    aprovarOrcamentoPublico,
    rejeitarOrcamentoPublico,
    sugerirAgendamentoPublico,
    registerProvider,
    googleLogin,
};
