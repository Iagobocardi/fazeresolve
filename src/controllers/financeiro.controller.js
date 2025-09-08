const Transacao = require('../models/transacao.model.js');
const mongoose = require('mongoose');
const financeiroService = require('../services/financeiro.service.js');

/**
 * Calcula e retorna um resumo financeiro para um determinado período.
 */
const getResumoFinanceiro = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { periodo } = req.query;

        const resumo = await financeiroService.getResumoFinanceiro(contaId, periodo);

        res.status(200).json(resumo);

    } catch (error) {
        console.error("Erro ao gerar resumo financeiro:", error);
        res.status(500).json({ message: "Erro ao gerar resumo financeiro.", error: error.message });
    }
};

/**
 * Retorna uma lista paginada do histórico de transações.
 */
const getHistoricoTransacoes = async (req, res) => {
    try {
        const { contaId } = req.user;
        // Adiciona paginação para performance
        const pagina = parseInt(req.query.pagina, 10) || 1;
        const limite = parseInt(req.query.limite, 10) || 20;
        const skip = (pagina - 1) * limite;

        const transacoes = await Transacao.find({ contaId })
            .sort({ data: -1 })
            .skip(skip)
            .limit(limite);

        const totalTransacoes = await Transacao.countDocuments({ contaId });

        res.status(200).json({
            transacoes,
            pagina,
            totalPaginas: Math.ceil(totalTransacoes / limite)
        });

    } catch (error) {
        console.error("Erro ao buscar histórico de transações:", error);
        res.status(500).json({ message: "Erro ao buscar histórico de transações.", error: error.message });
    }
};

/**
 * Cria uma nova transação manual (receita ou despesa).
 */
const createManualTransacao = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { tipo, descricao, valor, categoria, data, metodoPagamento } = req.body;

        // Validação básica
        if (!tipo || !descricao || !valor) {
            return res.status(400).json({ message: "Tipo, descrição e valor são obrigatórios." });
        }
        if (tipo !== 'Receita' && tipo !== 'Despesa') {
            return res.status(400).json({ message: "O tipo da transação deve ser 'Receita' ou 'Despesa'." });
        }

        const novaTransacao = new Transacao({
            contaId,
            tipo,
            descricao,
            valor,
            categoria,
            data: data ? new Date(data) : new Date(),
            metodoPagamento
        });

        const transacaoSalva = await novaTransacao.save();
        res.status(201).json(transacaoSalva);

    } catch (error) {
        console.error("Erro ao criar transação manual:", error);
        res.status(500).json({ message: "Erro ao criar transação manual.", error: error.message });
    }
};

module.exports = {
    getResumoFinanceiro,
    getHistoricoTransacoes,
    createManualTransacao
};
