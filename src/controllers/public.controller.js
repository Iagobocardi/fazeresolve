// src/controllers/public.controller.js

const Orcamento = require('../models/orcamento.model');

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
};
