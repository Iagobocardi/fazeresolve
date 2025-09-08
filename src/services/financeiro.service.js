const Transacao = require('../models/transacao.model');
const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');
const mongoose = require('mongoose');

/**
 * Calcula e retorna um resumo financeiro para um determinado período.
 * Esta é a fonte da verdade para faturamento, despesas e lucro.
 * @param {string} contaId - O ID da conta do usuário.
 * @param {string} periodo - O período para o qual o resumo deve ser gerado ('mes_atual', 'ultimos_30_dias', 'ano_atual').
 */
const getResumoFinanceiro = async (contaId, periodo = 'mes_atual') => {
    // Define o intervalo de datas com base no período solicitado
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

    return {
        faturamentoBruto,
        totalDespesas,
        lucroLiquido,
        margemLucro,
        periodo,
        dataInicio
    };
};

/**
 * Calcula o total de receitas futuras com base em orçamentos aceitos ou agendados.
 * @param {string} contaId - O ID da conta do usuário.
 */
const getReceitasFuturas = async (contaId) => {
    const baseQuery = { contaId: new mongoose.Types.ObjectId(contaId) };
    const receitasFuturasResult = await Orcamento.aggregate([
        { $match: { ...baseQuery, status: { $in: ['Aceito', 'Agendado'] } } },
        { $group: { _id: null, total: { $sum: '$valorProposto' } } }
    ]);
    return receitasFuturasResult[0]?.total || 0;
};


/**
 * Atualiza o valor total gasto por um cliente.
 * @param {string} clienteId - O ID do cliente a ser atualizado.
 * @param {number} valor - O valor a ser adicionado ao total gasto.
 */
const atualizarValorGastoCliente = async (clienteId, valor) => {
    if (!clienteId || !valor || valor <= 0) {
        return;
    }
    await Cliente.findByIdAndUpdate(clienteId, { $inc: { valorTotalGasto: valor } });
};

module.exports = {
    getResumoFinanceiro,
    getReceitasFuturas,
    atualizarValorGastoCliente
};
