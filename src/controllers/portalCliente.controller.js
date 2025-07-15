// src/controllers/portalCliente.controller.js
const mongoose = require('mongoose'); 
const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const whatsappService = require('../services/whatsapp.service');


// Lógica de Login
const login = async (req, res) => {
    console.log('--- 1. A tentar executar a função de login ---');
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }
        console.log(`--- 2. A procurar cliente com email: ${email} ---`);

        const cliente = await Cliente.findOne({ email }).select('+password');
        if (!cliente) {
            return res.status(404).json({ message: 'Email não encontrado.' });
        }
        console.log('--- 3. Cliente encontrado. Verificando a senha... ---');

        if (!cliente.password) {
            return res.status(400).json({ message: 'Login não disponível para esta conta.' });
        }
        const isMatch = await bcrypt.compare(password, cliente.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciais inválidas.' });
        }
        console.log('--- 4. Senha correta. Gerando o token... ---');

        if (!process.env.JWT_SECRET) {
            throw new Error('Configuração do servidor incompleta.');
        }
        const payload = { id: cliente._id, nome: cliente.nome, role: cliente.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        console.log('--- 5. Login bem-sucedido! A enviar token. ---');
        res.json({ token });

    } catch (error) {
        console.error('--- OCORREU UM ERRO INESPERADO NO BLOCO TRY DO LOGIN ---', error);
        res.status(500).json({ 
            message: 'Erro interno no servidor durante o login.',
            error_message: error.message
        });
    }
};

// Lógica para buscar os pedidos do cliente autenticado
const getMeusPedidos = async (req, res) => {
    try {
        const pedidos = await Orcamento.find({ cliente: req.cliente.id }).sort({ data: -1 });
        res.json(pedidos);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar os seus pedidos.' });
    }
};

// Nova função para buscar um pedido por ID, com verificação de segurança
const getMeuPedidoPorId = async (req, res) => {
    try {
        const clienteIdString = req.cliente.id; // ID do cliente (como string)
        const pedidoIdString = req.params.id;   // ID do pedido (como string)

        // =============================================================
        // ==> AQUI ESTÁ A CORREÇÃO: convertemos as strings para ObjectIds
        // =============================================================
        const clienteIdObj = new mongoose.Types.ObjectId(clienteIdString);
        const pedidoIdObj = new mongoose.Types.ObjectId(pedidoIdString);

        console.log('--- Buscando Pedido Específico com IDs Convertidos ---');
        console.log('ID do Cliente (ObjectId):', clienteIdObj);
        console.log('ID do Pedido (ObjectId):  ', pedidoIdObj);

        // Usamos os ObjectIds na busca
        const pedido = await Orcamento.findOne({ 
            _id: pedidoIdObj, 
            cliente: clienteIdObj 
        });

        console.log('Resultado da busca no MongoDB:', pedido);

        if (!pedido) {
            return res.status(404).json({ message: 'Pedido não encontrado ou não pertence a este cliente.' });
        }

        res.status(200).json(pedido);

    } catch (error) {
        console.error("ERRO em getMeuPedidoPorId:", error);
        res.status(500).json({ message: 'Erro ao buscar detalhes do pedido.' });
    }
};

// Nova função para aprovar um pedido
const aprovarPedido = async (req, res) => {
    try {
        const clienteId = req.cliente.id;
        const pedidoId = req.params.id;

        // A busca precisa do .populate() para termos acesso ao nome do cliente para a notificação
        const orcamento = await Orcamento.findOne({ _id: pedidoId, cliente: clienteId }).populate('cliente', 'nome');

        if (!orcamento) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
          if (!orcamento.valorProposto || orcamento.valorProposto <= 0) {
            return res.status(400).json({ message: 'Este orçamento ainda não pode ser aprovado pois não tem um valor definido pelo prestador.' });
        }
        
        orcamento.status = 'Aceito';
        orcamento.historico.push({ evento: 'Orçamento aprovado pelo cliente.' });
        await orcamento.save();

        // ==========================================================
        // ==> LÓGICA DE NOTIFICAÇÃO PARA O PRESTADOR ADICIONADA AQUI <==
        // ==========================================================
        const numeroPrestador = process.env.PRESTADOR_TELEFONE;
        if (numeroPrestador) {
            const clienteNome = orcamento.cliente.nome;
            const pedidoId = orcamento.shortId;
            const notificationMessage = `✅ Orçamento Aprovado!\n\nO cliente *${clienteNome}* aprovou o orçamento para o pedido *#${pedidoId}*.\n\nAcesse o painel para ver os detalhes.`;
            
            // Usamos o nosso serviço de WhatsApp para enviar a notificação
            await whatsappService.sendWhatsAppMessage(numeroPrestador, notificationMessage);
        }
        // Fim da lógica de notificação
        
        res.status(200).json({ message: 'Pedido aprovado com sucesso!', orcamento });
    } catch (error) {
        console.error("ERRO em aprovarPedido:", error);
        res.status(500).json({ message: 'Erro ao aprovar o pedido.' });
    }
};

// Nova função para rejeitar um pedido
const rejeitarPedido = async (req, res) => {
    try {
        const clienteId = req.cliente.id;
        const pedidoId = req.params.id;

        const orcamento = await Orcamento.findOne({ _id: pedidoId, cliente: clienteId });
        if (!orcamento) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        orcamento.status = 'Rejeitado';
        orcamento.historico.push({ evento: 'Orçamento rejeitado pelo cliente.' });
        await orcamento.save();

        res.status(200).json({ message: 'Pedido rejeitado com sucesso.', orcamento });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao rejeitar o pedido.' });
    }
};
// ==> NOVA FUNÇÃO PARA ATIVAR A CONTA <==
const ativarConta = async (req, res) => {
    try {
        const { token, email, password } = req.body;

        // 1. Encontra o cliente pelo token, garantindo que ele não expirou
        const cliente = await Cliente.findOne({
            activationToken: token,
            activationTokenExpires: { $gt: Date.now() } // $gt = greater than (maior que)
        });

        if (!cliente) {
            return res.status(400).json({ message: 'Token inválido ou expirado. Por favor, solicite um novo convite.' });
        }

        // 2. Atualiza os dados do cliente
        cliente.email = email;
        cliente.password = password; // O nosso pre-save hook irá criptografar isto automaticamente
        cliente.activationToken = undefined; // Limpa o token para não ser usado novamente
        cliente.activationTokenExpires = undefined;

        await cliente.save();
        
        res.status(200).json({ message: 'Conta ativada com sucesso! Você já pode fazer o login.' });

    } catch (error) {
        console.error("ERRO em ativarConta:", error);
        // Trata erro de email duplicado
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Este email já está em uso por outra conta.' });
        }
        res.status(500).json({ message: 'Erro ao ativar a conta.' });
    }
};
const sugerirAgendamento = async (req, res) => {
    try {
        const { dataSugerida } = req.body;
        const orcamento = await Orcamento.findOne({ _id: req.params.id, cliente: req.cliente.id });

        if (!orcamento || orcamento.status !== 'Aceito') {
            return res.status(400).json({ message: 'Este pedido não pode ser agendado neste momento.' });
        }

        orcamento.sugestaoAgendamentoCliente = dataSugerida;
        orcamento.historico.push({ evento: `Cliente sugeriu agendamento para: ${dataSugerida}` });
        await orcamento.save();

        // Notifica o PRESTADOR sobre a sugestão do cliente
        const numeroPrestador = process.env.PRESTADOR_TELEFONE;
        if (numeroPrestador) {
            const msg = `🗓️ Agendamento Sugerido!\n\nO cliente *${orcamento.cliente.nome}* sugeriu uma data para o pedido *#${orcamento.shortId}*:\n\n*Sugestão:* ${dataSugerida}\n\nAcesse o painel para confirmar.`;
            await whatsappService.sendWhatsAppMessage(numeroPrestador, msg);
        }

        res.status(200).json(orcamento);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao sugerir agendamento.' });
    }
};
// Não se esqueça de exportar a nova função!

module.exports = {
    login,
    getMeusPedidos,
    getMeuPedidoPorId,
    aprovarPedido,
    rejeitarPedido,
    ativarConta,
    sugerirAgendamento
};