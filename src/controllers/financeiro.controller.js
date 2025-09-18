const Transacao = require('../models/transacao.model.js');
const mongoose = require('mongoose');

/**
 * Calcula e retorna um resumo financeiro para um determinado período.
 */
const getResumoFinanceiro = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { periodo = 'mes_atual' } = req.query;

        const agora = new Date();
        let dataInicio;

        switch (periodo) {
            case 'ultimos_30_dias':
                dataInicio = new Date(new Date().setDate(agora.getDate() - 30));
                break;
            case 'ano_atual':
                dataInicio = new Date(agora.getFullYear(), 0, 1);
                break;
            case 'mes_atual':
            default:
                dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
                break;
        }

        const matchStage = {
            contaId: new mongoose.Types.ObjectId(contaId),
            data: { $gte: dataInicio }
        };

        const resultado = await Transacao.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$tipo",
                    total: { $sum: "$valor" }
                }
            }
        ]);

        let faturamentoBruto = 0;
        let totalDespesas = 0;

        resultado.forEach(item => {
            if (item._id === 'Receita') {
                faturamentoBruto = item.total;
            } else if (item._id === 'Despesa') {
                totalDespesas = item.total;
            }
        });

        const lucroLiquido = faturamentoBruto - totalDespesas;
        const margemLucro = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;

        res.status(200).json({
            faturamentoBruto,
            totalDespesas,
            lucroLiquido,
            margemLucro, // Enviar como número puro
        });

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
        // Adiciona uma verificação para o corpo da requisição (que agora é multipart)
        if (!req.body) {
            return res.status(400).json({ message: "Corpo da requisição ausente ou malformado." });
        }

        const { contaId } = req.user;
        const { tipo, descricao, valor, categoria, data, metodoPagamento, fornecedorId } = req.body;

        if (!tipo || !descricao || !valor) {
            return res.status(400).json({ message: "Tipo, descrição e valor são obrigatórios." });
        }
        if (tipo !== 'Receita' && tipo !== 'Despesa') {
            return res.status(400).json({ message: "O tipo da transação deve ser 'Receita' ou 'Despesa'." });
        }

        const transacaoData = {
            contaId,
            tipo,
            descricao,
            valor,
            categoria,
            data: data ? new Date(data) : new Date(),
            metodoPagamento,
        };

        if (fornecedorId) {
            transacaoData.fornecedorId = fornecedorId;
        }

        const novaTransacao = new Transacao(transacaoData);

        // Se o upload para o Cloudinary foi bem-sucedido, a URL estará em req.file.cloudinaryUrl
        if (req.file && req.file.cloudinaryUrl) {
            novaTransacao.comprovanteUrl = req.file.cloudinaryUrl;
        }

        const transacaoSalva = await novaTransacao.save();
        res.status(201).json(transacaoSalva);

    } catch (error) {
        console.error("Erro ao criar transação manual:", error);
        res.status(500).json({ message: "Erro ao criar transação manual.", error: error.message });
    }
};

/**
 * Deleta uma transação manual.
 */
const deleteManualTransacao = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { id } = req.params;

        const transacaoDeletada = await Transacao.findOneAndDelete({ _id: id, contaId });

        if (!transacaoDeletada) {
            return res.status(404).json({ message: "Transação não encontrada ou não pertence a esta conta." });
        }

        res.status(200).json({ message: "Transação deletada com sucesso." });

    } catch (error) {
        console.error("Erro ao deletar transação manual:", error);
        res.status(500).json({ message: "Erro ao deletar transação manual.", error: error.message });
    }
};

module.exports = {
    getResumoFinanceiro,
    getHistoricoTransacoes,
    createManualTransacao,
    deleteManualTransacao
};
