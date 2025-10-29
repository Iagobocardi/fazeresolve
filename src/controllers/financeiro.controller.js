const Transacao = require('../models/transacao.model.js');
const Despesa = require('../models/despesa.model.js');
const Orcamento = require('../models/orcamento.model.js');
const mongoose = require('mongoose');

/**
 * Calcula e retorna um resumo financeiro para um determinado período.
 */
const getResumoFinanceiro = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { periodo } = req.query; // Remove o valor padrão para calcular tudo por default

        const matchStage = {
            contaId: new mongoose.Types.ObjectId(contaId),
        };

        // Adiciona o filtro de data apenas se um período for especificado pelo cliente
        if (periodo) {
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
                    dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
                    break;
            }

            if (dataInicio) {
                matchStage.data = { $gte: dataInicio };
            }
        }

        const resultado = await Transacao.aggregate([
            { $match: matchStage },
            {
                $addFields: {
                    // Garante que o valor seja tratado como número, convertendo-o se for string
                    valorNumerico: { $toDouble: "$valor" }
                }
            },
            {
                $group: {
                    _id: "$tipo",
                    total: { $sum: "$valorNumerico" }
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
            margemLucro,
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

const getFinancialOverview = async (req, res) => {
    try {
        const { contaId } = req.user;
        const contaObjId = new mongoose.Types.ObjectId(contaId);
        const { period = '30d' } = req.query;

        let startDate = new Date();
        if (period === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else {
            startDate.setDate(startDate.getDate() - 30);
        }

        // 1. Cálculos baseados em Orçamentos e Despesas vinculadas
        const receitasOrcamentosPromise = Orcamento.aggregate([
            { $match: { contaId: contaObjId, 'pagamentos.data': { $gte: startDate } } },
            { $unwind: '$pagamentos' },
            { $match: { 'pagamentos.data': { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$pagamentos.valor' } } }
        ]);

        const despesasVinculadasPromise = Despesa.aggregate([
            { $match: { contaId: contaObjId, data: { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$valor' } } }
        ]);

        // 2. Cálculo de Transações Manuais (Novas Receitas e Despesas)
        const transacoesManuaisPromise = Transacao.aggregate([
            { $match: { contaId: contaObjId, data: { $gte: startDate } } },
            {
                $group: {
                    _id: '$tipo',
                    total: { $sum: '$valor' }
                }
            }
        ]);

        const transacoesAgrupadasPromise = Orcamento.aggregate([
            { $match: { contaId: contaObjId, data: { $gte: startDate } } },
            { $lookup: { from: 'despesas', localField: '_id', foreignField: 'orcamentoId', as: 'despesasVinculadas' } },
            { $lookup: { from: 'clientes', localField: 'cliente', foreignField: '_id', as: 'clienteInfo' } },
            {
                $addFields: {
                    totalReceitas: { $sum: '$pagamentos.valor' },
                    totalDespesas: { $sum: '$despesasVinculadas.valor' },
                    clienteNome: { $ifNull: [{ $arrayElemAt: ['$clienteInfo.nome', 0] }, 'N/A'] }
                }
            },
            { $addFields: { lucro: { $subtract: ['$totalReceitas', '$totalDespesas'] } } },
            { $match: { $or: [{ totalReceitas: { $gt: 0 } }, { totalDespesas: { $gt: 0 } }] } },
            { $sort: { data: -1 } },
            { $project: { _id: 1, shortId: 1, descricao: 1, data: 1, clienteNome: 1, totalReceitas: 1, totalDespesas: 1, lucro: 1 } }
        ]);
        
        // Adiciona transações manuais à lista de transações para exibição
        const transacoesManuaisListPromise = Transacao.find({
            contaId: contaObjId,
            data: { $gte: startDate }
        }).sort({ data: -1 });

        const contasAPagarPromise = Despesa.find({
            contaId: contaObjId,
            pago: false,
            dataVencimento: { $exists: true, $ne: null }
        }).sort({ dataVencimento: 1 });

        const recebimentosPendentesPromise = Orcamento.find({
            contaId: contaObjId,
            statusPagamento: 'Pendente'
        }).populate('cliente', 'nome').sort({ dataVencimento: 1 });

        // Executar todas as promessas
        const [
            receitasOrcamentosResult,
            despesasVinculadasResult,
            transacoesManuaisResult,
            transacoesAgrupadasOrcamentos,
            transacoesManuaisList,
            contasAPagar,
            recebimentosPendentes
        ] = await Promise.all([
            receitasOrcamentosPromise,
            despesasVinculadasPromise,
            transacoesManuaisPromise,
            transacoesAgrupadasPromise,
            transacoesManuaisListPromise,
            contasAPagarPromise,
            recebimentosPendentesPromise
        ]);

        // Processar resultados das transações manuais
        let receitasManuais = 0;
        let despesasManuais = 0;
        transacoesManuaisResult.forEach(item => {
            if (item._id === 'Receita') {
                receitasManuais = item.total;
            } else if (item._id === 'Despesa') {
                despesasManuais = item.total;
            }
        });

        // Consolidar KPIs
        const faturamentoBruto = (receitasOrcamentosResult[0]?.total || 0) + receitasManuais;
        const totalDespesas = (despesasVinculadasResult[0]?.total || 0) + despesasManuais;
        const lucroLiquido = faturamentoBruto - totalDespesas;
        const margemDeLucro = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;

        const kpis = {
            faturamentoBruto,
            totalDespesas,
            lucroLiquido,
            margemDeLucro,
        };

        // Formatar e Unir listas de transações
        const transacoesManuaisFormatadas = transacoesManuaisList.map(t => ({
            _id: t._id,
            tipo: t.tipo, // Adiciona o tipo para o frontend saber como exibir
            descricao: t.descricao,
            data: t.data,
            clienteNome: 'Transação Manual',
            totalReceitas: t.tipo === 'Receita' ? t.valor : 0,
            totalDespesas: t.tipo === 'Despesa' ? t.valor : 0,
            lucro: t.tipo === 'Receita' ? t.valor : -t.valor
        }));

        const transacoesAgrupadas = [...transacoesAgrupadasOrcamentos, ...transacoesManuaisFormatadas]
            .sort((a, b) => new Date(b.data) - new Date(a.data));


        res.status(200).json({
            kpis,
            transacoesAgrupadas,
            contasAPagar,
            recebimentosPendentes
        });

    } catch (error) {
        console.error("Erro ao buscar visão geral financeira:", error);
        res.status(500).json({ message: "Erro ao buscar dados financeiros." });
    }
};

module.exports = {
    getResumoFinanceiro,
    getHistoricoTransacoes,
    createManualTransacao,
    deleteManualTransacao,
    getFinancialOverview
};
