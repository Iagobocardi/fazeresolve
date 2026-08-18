// src/controllers/portalCliente.controller.js
const mongoose = require('mongoose'); 
const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const whatsappService = require('../services/whatsapp.service');
const orcamentoService = require('../services/orcamento.service'); 

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
// Lógica de login via "Magic Link" (token)
const loginComToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Token de acesso não fornecido.' });
        }

        // 1. Encontra o cliente pelo token, garantindo que ele não expirou
        const cliente = await Cliente.findOne({
            activationToken: token,
            activationTokenExpires: { $gt: Date.now() }
        });

        if (!cliente) {
            return res.status(400).json({ message: 'Token inválido ou expirado.' });
        }

        // 2. Limpa o token de uso único para que não possa ser reutilizado
        cliente.activationToken = undefined;
        cliente.activationTokenExpires = undefined;
        await cliente.save();

        // 3. Gera um JWT de longa duração para a sessão do cliente
        const payload = { id: cliente._id, nome: cliente.nome, role: 'Cliente' }; // Define a role explicitamente
        const jwtToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // 4. Retorna o token de sessão e os dados do cliente
        res.status(200).json({
            message: 'Login realizado com sucesso!',
            token: jwtToken,
            cliente: cliente
        });

    } catch (error) {
        console.error("ERRO em loginComToken:", error);
        res.status(500).json({ message: 'Erro interno ao processar o login.' });
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
    getMeusPedidos,
    getMeuPedidoPorId,
    rejeitarPedido,
    loginComToken,
    sugerirAgendamento,
    aprovarOrcamento,
};
