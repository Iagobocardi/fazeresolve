const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');// Assumindo que seu modelo de pedido se chama assim
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// DENTRO de src/controllers/portalCliente.controller.js
// SUBSTITUA A SUA FUNÇÃO 'exports.login' ANTIGA POR ESTA:

exports.login = async (req, res) => {
    console.log('--- 1. A tentar executar a função de login ---');
    const { email, password } = req.body;

    try {
        // Verificação #1: O email e a senha foram enviados?
        if (!email || !password) {
            console.log('--- ERRO: Email ou senha não fornecidos no corpo da requisição. ---');
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }
        console.log(`--- 2. A procurar cliente com email: ${email} ---`);

        // Verificação #2: O cliente existe?
        const cliente = await Cliente.findOne({ email }).select('+password');
        if (!cliente) {
            console.log(`--- ERRO: Cliente com email ${email} não encontrado na base de dados. ---`);
            return res.status(404).json({ message: 'Email não encontrado.' });
        }
        console.log('--- 3. Cliente encontrado. Verificando a senha... ---');

        // Verificação #3: O cliente tem uma senha guardada?
        if (!cliente.password) {
            console.log(`--- ERRO: O cliente ${email} existe mas não tem uma senha cadastrada. ---`);
            return res.status(400).json({ message: 'Login não disponível para esta conta. Por favor, contacte o suporte.' });
        }
        const isMatch = await bcrypt.compare(password, cliente.password);
        if (!isMatch) {
            console.log('--- ERRO: A senha fornecida para o cliente ${email} está incorreta. ---');
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }
        console.log('--- 4. Senha correta. Gerando o token... ---');

        // Verificação #4: A chave secreta do JWT existe?
        if (!process.env.JWT_SECRET) {
            console.error('--- ERRO FATAL: JWT_SECRET não está definido no ficheiro .env! Impossível gerar token. ---');
            throw new Error('Configuração do servidor incompleta.');
        }
        const payload = { id: cliente._id, nome: cliente.nome, role: cliente.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        console.log('--- 5. Login bem-sucedido! A enviar token. ---');
        res.json({ token });

    } catch (error) {
        // O nosso novo catch que regista TUDO
        console.error('--- OCORREU UM ERRO INESPERADO NO BLOCO TRY DO LOGIN ---', error);
        res.status(500).json({ 
            message: 'Erro interno no servidor durante o login.',
            error_message: error.message,
            stack: error.stack
        });
    }
};

// Lógica para buscar os pedidos do cliente autenticado
exports.getMeusPedidos = async (req, res) => {
    try {
        // O req.cliente.id vem do token que foi verificado no middleware!
        const pedidos = await Orcamento.find({ cliente: req.cliente.id }).sort({ data: -1 });
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar os seus pedidos.' });
    }
};