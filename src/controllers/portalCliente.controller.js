// src/controllers/portalCliente.controller.js
const mongoose = require('mongoose'); 
const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const whatsappService = require('../services/whatsapp.service');
const orcamentoService = require('../services/orcamento.service'); 

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

        // --- A CORREÇÃO ESTÁ AQUI ---
        // Agora, permitimos a sugestão se o status for 'Aceito' OU 'Agendado'.
        if (!orcamento || !['Aceito', 'Agendado'].includes(orcamento.status)) {
            return res.status(400).json({ message: 'Este pedido não pode ser agendado ou reagendado neste momento.' });
        }

        const isReagendamento = orcamento.status === 'Agendado';

        orcamento.sugestaoAgendamentoCliente = dataSugerida;
        orcamento.historico.push({ 
            evento: isReagendamento 
                ? `Cliente solicitou reagendamento para: ${dataSugerida}`
                : `Cliente sugeriu agendamento para: ${dataSugerida}`
        });
        await orcamento.save();

        // Notifica o PRESTADOR sobre a sugestão do cliente
        const numeroPrestador = process.env.PRESTADOR_TELEFONE;
        if (numeroPrestador) {
            const clienteInfo = await orcamentoService.getClienteInfo(orcamento._id);
            const msg = `🗓️ ${isReagendamento ? 'Solicitação de Reagendamento' : 'Agendamento Sugerido'}!\n\nO cliente *${clienteInfo.nome}* sugeriu uma nova data para o pedido *#${orcamento.shortId}*:\n\n*Sugestão:* ${dataSugerida}\n\nAcesse o painel para confirmar.`;
            // await whatsappService.sendWhatsAppMessage(numeroPrestador, msg);
        }

        res.status(200).json(orcamento);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao sugerir agendamento.' });
    }
};
const aprovarOrcamento = async (req, res) => {
    try {
        const orcamentoId = req.params.id;
        const clienteId = req.cliente.id;

        // 1. Usa o serviço para mudar o status para "Aceito"
        const orcamentoAtualizado = await orcamentoService.atualizarStatus(orcamentoId, 'Aceito');

        // 2. Verificação de segurança
        if (orcamentoAtualizado.cliente.toString() !== clienteId) {
            return res.status(403).json({ error: "Acesso não autorizado." });
        }

        // 3. Notifica o prestador
        const prestadorPhone = process.env.PRESTADOR_TELEFONE;
        if (prestadorPhone) {
            // Usamos a nova função do serviço para obter o nome do cliente
            const clienteInfo = await orcamentoService.getClienteInfo(orcamentoId);
            const notificacao = `🔔 Orçamento Aprovado!\n\nO cliente "${clienteInfo.nome}" aprovou o pedido #${orcamentoAtualizado.shortId}.\n\nO pedido está agora no estado "Aceito", pronto para agendamento.`;
            //await whatsappService.sendWhatsAppMessage(prestadorPhone, notificacao);
        }
        
        // 4. Envia a resposta de sucesso
        res.status(200).json({ 
            message: "Orçamento aprovado com sucesso!", 
            orcamento: orcamentoAtualizado 
        });

    } catch (error) {
        console.error("ERRO na rota /orcamentos/:id/aprovar:", error);
        res.status(500).json({ error: error.message || 'Erro interno ao aprovar o orçamento.' });
    }
};
// Não se esqueça de exportar a nova função!

module.exports = {
    login,
    getMeusPedidos,
    getMeuPedidoPorId,
    rejeitarPedido,
    ativarConta,
    sugerirAgendamento,
    aprovarOrcamento,
};