// Arquivo: src/controllers/orcamentos.controller.js

const mongoose = require('mongoose');
const Orcamento = require('../models/orcamento.model');
const { validationResult, body } = require('express-validator');
const whatsappService = require('../services/whatsapp.service');
const Produto = require('../models/produto.model');
const MovimentoEstoque = require('../models/movimentoEstoque.model'); 
const Despesa = require('../models/despesa.model');
const pdfService = require('../services/pdf.service');
const fs = require('fs');
const path = require('path');   
const orcamentoService = require('../services/orcamento.service');
const Conta = require('../models/conta.model'); // MUDANÇA: Usa o novo modelo Conta

// Regras de validação
const orcamentoValidationRules = () => {
    return [
        body('status').optional().isIn(['Pendente', 'Aceito', 'Rejeitado', 'Agendado', 'Finalizado']).withMessage('Status inválido').trim(),
    ];
};

// Obtém todos os orçamentos da conta
const getAllOrcamentos = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const { search, statusPagamento, dataInicio, dataFim } = req.query;

        const pipeline = [
            // MUDANÇA: Filtra pela conta do usuário logado
            { $match: { contaId: new mongoose.Types.ObjectId(contaId) } },
            {
                $lookup: {
                    from: 'clientes',
                    localField: 'cliente',
                    foreignField: '_id',
                    as: 'clienteInfo'
                }
            },
            {
                $unwind: {
                    path: '$clienteInfo',
                    preserveNullAndEmptyArrays: true 
                }
            }
        ];

        pipeline.push({
            $addFields: {
                totalPago: { $sum: '$pagamentos.valor' },
                statusPagamentoCalculado: {
                    $switch: {
                        branches: [
                            { case: { $eq: [{ $sum: '$pagamentos.valor' }, 0] }, then: 'pendente' },
                            { case: { $gte: [{ $sum: '$pagamentos.valor' }, '$valorProposto'] }, then: 'pago' }
                        ],
                        default: 'parcial'
                    }
                }
            }
        });

        const matchStage = {};
        if (search) {
            const regex = new RegExp(search, 'i');
            matchStage.$or = [
                { 'clienteInfo.nome': regex },
                { 'clienteInfo.telefone': regex },
                { 'descricao': regex }
            ];
        }
        if (statusPagamento && statusPagamento !== 'todos') {
            matchStage.statusPagamentoCalculado = statusPagamento;
        }
        if (dataInicio && dataFim) {
            matchStage.data = {
                $gte: new Date(dataInicio),
                $lte: new Date(new Date(dataFim).setDate(new Date(dataFim).getDate() + 1))
            };
        }
        if (Object.keys(matchStage).length > 0) {
            pipeline.push({ $match: matchStage });
        }
        pipeline.push({ $sort: { 'data': -1 } });
        const orcamentos = await Orcamento.aggregate(pipeline);
        const orcamentosComCliente = orcamentos.map(orc => ({ ...orc, cliente: orc.clienteInfo }));
        res.json(orcamentosComCliente);
        
    } catch (error) {
        console.error("Erro ao buscar orçamentos com filtros:", error);
        res.status(500).json({ message: error.message });
    }
};

// Obtém um orçamento por ID
const getOrcamentoById = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const orcamento = await Orcamento.findOne({ _id: req.params.id, contaId }) // MUDANÇA
            .populate('cliente', 'nome telefone')
            .populate('materiaisUsados.produto');

        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(orcamento);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar orçamento.' });
    }
};

const calcularPrecoSugerido = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const { pedidoId } = req.params;

        const aggregationResult = await Orcamento.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(pedidoId), contaId: new mongoose.Types.ObjectId(contaId) } }, // MUDANÇA
            // ... (resto da agregação)
        ]);
        // ... (resto da função)
    } catch (error) {
        console.error("Erro ao calcular preço sugerido:", error);
        res.status(500).json({ message: 'Erro ao processar a sugestão de preço.' });
    }
};

// Cria um novo orçamento
const createOrcamento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { id: prestadorId, contaId } = req.user; // MUDANÇA

        const dadosOrcamento = {
            ...req.body,
            prestadorId: prestadorId, // Mantido por compatibilidade, mas a conta é a referência principal
            contaId: contaId // MUDANÇA
        };

        const novoOrcamento = new Orcamento(dadosOrcamento);
        const orcamentoSalvo = await novoOrcamento.save();
        res.status(201).json(orcamentoSalvo);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar orçamento.' });
    }
};

// Atualiza um orçamento por ID
const updateOrcamento = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const orcamentoAtualizado = await Orcamento.findOneAndUpdate({ _id: req.params.id, contaId }, req.body, { new: true }); // MUDANÇA
        if (!orcamentoAtualizado) {
            return res.status(404).json({ error: 'Orçamento não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(orcamentoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar orçamento.' });
    }
};

// Deleta um orçamento por ID
const deleteOrcamento = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const orcamentoDeletado = await Orcamento.findOneAndDelete({ _id: req.params.id, contaId }); // MUDANÇA
        if (!orcamentoDeletado) {
            return res.status(404).json({ error: 'Orçamento não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json({ message: 'Orçamento deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar orçamento.' });
    }
};

// ... (outras funções como getRecentOrcamentos, updateNotasInternas, etc. também precisam ser refatoradas com contaId)

// Exemplo de refatoração para uma função que chama um serviço
const updateOrcamentoStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const orcamentoId = req.params.id;
        const { contaId } = req.user; // MUDANÇA

        const orcamentoAtualizado = await orcamentoService.atualizarStatus(contaId, orcamentoId, status); // MUDANÇA
        res.status(200).json(orcamentoAtualizado);
    } catch (error) {
        console.error("ERRO na rota updateOrcamentoStatus:", error);
        res.status(500).json({ error: error.message || 'Erro ao atualizar status do orçamento.' });
    }
};

const submitOrcamento = async (req, res) => {
    try {
        const { valorProposto } = req.body;
        const orcamentoId = req.params.id;
        const { contaId } = req.user; // MUDANÇA

        const orcamentoAtualizado = await orcamentoService.submeterOrcamento(contaId, orcamentoId, valorProposto); // MUDANÇA
        res.status(200).json(orcamentoAtualizado);
    } catch (error) {
        console.error("ERRO na rota submitOrcamento:", error);
        if (error.message.includes('Valor') || error.message.includes('obrigatório')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Erro interno ao submeter o orçamento.' });
    }
};

const scheduleOrcamento = async (req, res) => {
    try {
        const { dataAgendamento } = req.body;
        const orcamentoId = req.params.id;
        const { contaId } = req.user; // MUDANÇA
        
        const orcamentoAtualizado = await orcamentoService.agendarServico(contaId, orcamentoId, dataAgendamento); // MUDANÇA
        res.status(200).json(orcamentoAtualizado);
    } catch (error) {
        console.error("ERRO na rota scheduleOrcamento:", error);
        res.status(500).json({ error: error.message || 'Erro interno ao agendar o serviço.' });
    }
};

const gerarLinkPagamento = async (req, res) => {
    try {
        const orcamentoId = req.params.id;
        const { contaId } = req.user; // MUDANÇA
        const orcamento = await orcamentoService.gerarLinkPagamentoMercadoPago(contaId, orcamentoId); // MUDANÇA
        res.status(200).json({ message: 'Link de pagamento gerado com sucesso!', orcamento });
    } catch (error) {
        if (error.name === 'NotFoundError' || error.name === 'ForbiddenError' || error.name === 'BusinessLogicError') {
            return res.status(error.statusCode || 400).json({ message: error.message });
        }
        console.error('Erro ao gerar link de pagamento:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};


// É necessário refatorar TODAS as outras funções neste arquivo da mesma forma,
// adicionando o escopo de `contaId` em todas as consultas e chamadas de serviço.

module.exports = {
    orcamentoValidationRules,
    getAllOrcamentos,
    getOrcamentoById,
    createOrcamento,
    updateOrcamento,
    deleteOrcamento,
    // ... (exportar todas as outras funções refatoradas)
    updateOrcamentoStatus,
    submitOrcamento,
    scheduleOrcamento,
    gerarLinkPagamento
};
