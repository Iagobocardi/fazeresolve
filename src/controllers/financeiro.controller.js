const Transacao = require('../models/transacao.model.js');
const mongoose = require('mongoose');
const Orcamento = require('../models/orcamento.model.js');
const Despesa = require('../models/despesa.model.js');

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
            // Default to 30 days
            startDate.setDate(startDate.getDate() - 30);
        }

        // --- PROMISES DE DADOS ---

        // 1. Receitas de Orçamentos
        const receitasPromise = Orcamento.aggregate([
            { $match: { contaId: contaObjId, 'pagamentos.data': { $gte: startDate } } },
            { $unwind: '$pagamentos' },
            { $match: { 'pagamentos.data': { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$pagamentos.valor' } } }
        ]);

        // 2. Despesas Vinculadas a Orçamentos
        const despesasPromise = Despesa.aggregate([
            { $match: { contaId: contaObjId, data: { $gte: startDate } } },
            { $group: { _id: null, total: { $sum: '$valor' } } }
        ]);

        // 3. Transações Manuais (para KPIs)
        const manualTransacoesKpiPromise = Transacao.aggregate([
            { $match: { contaId: contaObjId, data: { $gte: startDate } } },
            { $group: { _id: '$tipo', total: { $sum: '$valor' } } }
        ]);
        
        // 4. Lista de Transações de Orçamentos
        const transacoesOrcamentoPromise = Orcamento.aggregate([
            { $match: { contaId: contaObjId, data: { $gte: startDate } } },
            { $lookup: { from: 'despesas', localField: '_id', foreignField: 'orcamentoId', as: 'despesasVinculadas' } },
            { $lookup: { from: 'clientes', localField: 'cliente', foreignField: '_id', as: 'clienteInfo' } },
            {
                $addFields: {
                    totalReceitas: { $sum: '$pagamentos.valor' },
                    totalDespesas: { $sum: '$despesasVinculadas.valor' },
                    clienteNome: { $ifNull: [{ $arrayElemAt: ['$clienteInfo.nome', 0] }, 'Cliente não encontrado'] }
                }
            },
            {
                $addFields: {
                    lucro: { $subtract: ['$totalReceitas', '$totalDespesas'] }
                }
            },
            { $match: { $or: [ { totalReceitas: { $gt: 0 } }, { totalDespesas: { $gt: 0 } } ] } },
            { $sort: { data: -1 } },
            {
                $project: {
                    _id: 1, shortId: 1, descricao: 1, data: 1, clienteNome: 1,
                    totalReceitas: 1, totalDespesas: 1, lucro: 1,
                    receitas: '$pagamentos', despesas: '$despesasVinculadas'
                }
            }
        ]);

        // 5. Lista de Transações Manuais
        const manualTransacoesListPromise = Transacao.find({
            contaId: contaObjId,
            data: { $gte: startDate }
        }).lean();

        // 6. Contas a Pagar
        const contasAPagarPromise = Despesa.find({
            contaId: contaObjId,
            pago: false,
            dataVencimento: { $exists: true, $ne: null }
        }).sort({ dataVencimento: 1 });

        // 7. Recebimentos Pendentes
        const recebimentosPendentesPromise = Orcamento.find({
            contaId: contaObjId,
            statusPagamento: 'Pendente'
        }).populate('cliente', 'nome').sort({ dataVencimento: 1 });

        // --- EXECUÇÃO DAS PROMISES ---
        const [
            receitasOrcamentoResult,
            despesasOrcamentoResult,
            manualKpisResult,
            transacoesOrcamento,
            manualList,
            contasAPagar,
            recebimentosPendentes
        ] = await Promise.all([
            receitasPromise,
            despesasPromise,
            manualTransacoesKpiPromise,
            transacoesOrcamentoPromise,
            manualTransacoesListPromise,
            contasAPagarPromise,
            recebimentosPendentesPromise
        ]);

        // --- CÁLCULO DOS KPIs ---
        let faturamentoBruto = receitasOrcamentoResult[0]?.total || 0;
        let totalDespesas = despesasOrcamentoResult[0]?.total || 0;
        
        const manualReceitas = manualKpisResult.find(t => t._id === 'Receita')?.total || 0;
        const manualDespesas = manualKpisResult.find(t => t._id === 'Despesa')?.total || 0;

        faturamentoBruto += manualReceitas;
        totalDespesas += manualDespesas;

        const lucroLiquido = faturamentoBruto - totalDespesas;
        const margemDeLucro = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;
        
        const kpis = {
            faturamentoBruto,
            totalDespesas,
            lucroLiquido,
            margemDeLucro,
        };
        
        // --- FORMATAÇÃO E UNIÃO DAS TRANSAÇÕES ---
        const formattedManualTransacoes = manualList.map(transacao => {
            const isReceita = transacao.tipo === 'Receita';
            return {
                _id: transacao._id,
                shortId: 'MANUAL',
                descricao: transacao.descricao,
                data: transacao.data,
                clienteNome: 'Transação Manual',
                totalReceitas: isReceita ? transacao.valor : 0,
                totalDespesas: !isReceita ? transacao.valor : 0,
                lucro: isReceita ? transacao.valor : -transacao.valor,
                receitas: isReceita ? [{
                    _id: transacao._id,
                    valor: transacao.valor,
                    data: transacao.data,
                    metodoPagamento: transacao.metodoPagamento,
                    descricao: `Receita: ${transacao.descricao}`
                }] : [],
                despesas: !isReceita ? [{
                    _id: transacao._id,
                    valor: transacao.valor,
                    data: transacao.data,
                    descricao: `Despesa: ${transacao.descricao}`,
                    categoria: transacao.categoria
                }] : [],
            };
        });

        const transacoesAgrupadas = [...transacoesOrcamento, ...formattedManualTransacoes];
        transacoesAgrupadas.sort((a, b) => new Date(b.data) - new Date(a.data));

        // --- RESPOSTA FINAL ---
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
