// Arquivo: src/controllers/stats.controller.js
// Versão final e completa, com todas as funções de estatísticas.

const Orcamento = require('../models/orcamento.model');
const Despesa = require('../models/despesa.model');
const Cliente = require('../models/cliente.model');
const mongoose = require('mongoose'); // Adicionado para usar mongoose.Types.ObjectId
const Transacao = require('../models/transacao.model.js'); // Importação que faltava

// Helper para garantir que todas as queries sejam relativas à conta do usuário
const getBaseQuery = (req) => ({ contaId: req.user.contaId });


// Função para os cards do Dashboard principal
const getDashboardStats = async (req, res) => {
    try {
        const baseQuery = getBaseQuery(req);
        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

        const novasSolicitacoes = await Orcamento.countDocuments({ ...baseQuery, data: { $gte: trintaDiasAtras } });

        const faturamentoResult = await Orcamento.aggregate([
            { $match: { ...baseQuery, status: 'Finalizado', dataFinalizacao: { $gte: trintaDiasAtras } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const faturamento = faturamentoResult.length > 0 ? faturamentoResult[0].total : 0;

        const satisfacaoResult = await Orcamento.aggregate([
            { $match: { ...baseQuery, notaSatisfacao: { $exists: true, $ne: null } } },
            { $group: { _id: null, media: { $avg: '$notaSatisfacao' } } }
        ]);
        const satisfacaoMedia = satisfacaoResult.length > 0 ? satisfacaoResult[0].media : 0;

        const receitasFuturasResult = await Orcamento.aggregate([
            { $match: { ...baseQuery, status: { $in: ['Aceito', 'Agendado'] } } },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const receitasFuturas = receitasFuturasResult.length > 0 ? receitasFuturasResult[0].total : 0;

        res.status(200).json({ novasSolicitacoes, faturamento, satisfacaoMedia, receitasFuturas });
    } catch (error) {
        console.error("ERRO em getDashboardStats:", error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard.' });
    }
};

const getFaturamentoMensal = async (req, res) => {
    try {
        const baseQuery = getBaseQuery(req);
        const hoje = new Date();
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(hoje.getMonth() - 6);

        const dados = await Orcamento.aggregate([
            { $match: { ...baseQuery, status: 'Finalizado', dataFinalizacao: { $gte: seisMesesAtras } } },
            { $group: { _id: { ano: { $year: "$dataFinalizacao" }, mes: { $month: "$dataFinalizacao" } }, faturamento: { $sum: "$valorProposto" } } },
            { $sort: { "_id.ano": 1, "_id.mes": 1 } },
            { $project: { _id: 0, mes: { $concat: [{ $toString: "$_id.ano" }, "-", { $cond: [{ $lt: ["$_id.mes", 10] }, { $concat: ["0", { $toString: "$_id.mes" }] }, { $toString: "$_id.mes" }] }] }, faturamento: 1 } }
        ]);
        res.status(200).json(dados);
    } catch (error) {
        console.error("ERRO em getFaturamentoMensal:", error);
        res.status(500).json({ message: 'Erro ao buscar dados de faturamento mensal.' });
    }
};

// =====================================================================
// ==> ESTA É A ÚNICA FUNÇÃO QUE FOI ATUALIZADA COM A LÓGICA CORRETA <==
// =====================================================================
const getResumoFinanceiro = async (req, res) => {
    try {
        const hoje = new Date();
        const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

        const baseQuery = getBaseQuery(req);

        // 1. Calcular Faturamento Pago no Mês
        const faturamentoResult = await Orcamento.aggregate([
            {
                $match: {
                    ...baseQuery,
                    status: 'Finalizado',
                    statusPagamento: 'Pago',
                    dataFinalizacao: { $gte: inicioDoMes, $lte: fimDoMes }
                }
            },
            { $group: { _id: null, total: { $sum: '$valorProposto' } } }
        ]);
        const faturamentoPago = faturamentoResult[0]?.total || 0;

        // 2. Calcular Total de Despesas no Mês
        const despesasResult = await Despesa.aggregate([
            { $match: { ...baseQuery, data: { $gte: inicioDoMes, $lte: fimDoMes } } },
            { $group: { _id: null, total: { $sum: '$valor' } } }
        ]);
        const totalDespesas = despesasResult[0]?.total || 0;
        
        // 3. Calcular Lucro Líquido
        const lucroLiquido = parseFloat(faturamentoPago.toString()) - parseFloat(totalDespesas.toString());
        
        // 4. Enviar os dados corretos e unificados
        res.status(200).json({
            faturamentoPago,
            totalDespesas,
            lucroLiquido
        });

    } catch (error) {
        console.error("ERRO em getResumoFinanceiro:", error);
        res.status(500).json({ message: 'Erro ao calcular resumo financeiro.' });
    }
};
const Transacao = require('../models/transacao.model.js'); // Importar o modelo Transacao

const getHistoricoFinanceiro = async (req, res) => {
    try {
        const { contaId } = req.user;
        const hoje = new Date();
        const seisMesesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1);

        // 1. AGREGAÇÃO ÚNICA na coleção de Transações (fonte da verdade)
        const dadosAgregados = await Transacao.aggregate([
            {
                $match: {
                    contaId: new mongoose.Types.ObjectId(contaId),
                    data: { $gte: seisMesesAtras }
                }
            },
            {
                $group: {
                    _id: {
                        mes: { $dateToString: { format: "%Y-%m", date: "$data" } },
                        tipo: "$tipo"
                    },
                    total: { $sum: "$valor" }
                }
            },
            {
                $group: {
                    _id: "$_id.mes",
                    transacoes: {
                        $push: {
                            tipo: "$_id.tipo",
                            total: "$total"
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 2. PREPARAR O RESULTADO FINAL
        const resultado = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
            const mesChave = d.toISOString().slice(0, 7); // Formato "YYYY-MM"
            resultado[mesChave] = {
                mes: new Date(d).toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
                faturamento: 0,
                despesas: 0,
                lucro: 0
            };
        }

        // 3. PREENCHER com os dados agregados
        dadosAgregados.forEach(item => {
            const mesChave = item._id;
            if (resultado[mesChave]) {
                item.transacoes.forEach(t => {
                    if (t.tipo === 'Receita') {
                        resultado[mesChave].faturamento = t.total;
                    } else if (t.tipo === 'Despesa') {
                        resultado[mesChave].despesas = t.total;
                    }
                });
            }
        });

        // 4. CALCULAR O LUCRO E FORMATAR
        const dadosDoGrafico = Object.values(resultado).map(item => {
            item.lucro = item.faturamento - item.despesas;
            return item;
        });

        res.status(200).json(dadosDoGrafico);

    } catch (error) {
        console.error("Erro ao gerar histórico financeiro:", error);
        res.status(500).json({ message: 'Erro interno ao processar dados financeiros.' });
    }
};
const getTopServicos = async (req, res) => {
    try {
        const baseQuery = getBaseQuery(req);
        const topServicos = await Orcamento.aggregate([
            // 1. Filtra apenas os pedidos que foram de fato concluídos
            {
                $match: { ...baseQuery, status: 'Finalizado' }
            },
            // 2. Agrupa os pedidos pela sua descrição e conta quantos existem em cada grupo
            {
                $group: {
                    _id: '$descricao', // Agrupa por nome do serviço
                    count: { $sum: 1 }  // Conta um para cada ocorrência
                }
            },
            // 3. Ordena os resultados pela contagem, do maior para o menor
            {
                $sort: { count: -1 }
            },
            // 4. Limita o resultado aos 7 mais populares
            {
                $limit: 7
            },
            // 5. Formata a saída para um nome mais amigável para o frontend
            {
                $project: {
                    _id: 0, // Remove o campo _id
                    name: '$_id', // Renomeia _id para name
                    value: '$count' // Renomeia count para value (útil para gráficos)
                }
            }
        ]);

        res.status(200).json(topServicos);

    } catch (error) {
        console.error("Erro ao buscar top serviços:", error);
        res.status(500).json({ message: 'Erro interno ao buscar dados de serviços.' });
    }
};
const getTopClientes = async (req, res) => {
    try {
        const baseQuery = getBaseQuery(req);
        const topClientes = await Orcamento.aggregate([
            // 1. Filtra apenas os pedidos que foram de fato concluídos
            {
                $match: { ...baseQuery, status: 'Finalizado' }
            },
            // 2. Agrupa os pedidos pelo ID do cliente e soma o valor proposto de cada um
            {
                $group: {
                    _id: '$cliente', // Agrupa pelo campo 'cliente' (que é um ObjectId)
                    totalFaturado: { $sum: '$valorProposto' } // Soma o valor de cada pedido do grupo
                }
            },
            // 3. Ordena os resultados pelo faturamento, do maior para o menor
            {
                $sort: { totalFaturado: -1 }
            },
            // 4. Limita o resultado aos 5 melhores clientes
            {
                $limit: 5
            },
            // 5. Junta ("lookup") com a coleção de 'clientes' para obter o nome
            {
                $lookup: {
                    from: 'clientes', // O nome exato da sua coleção de clientes no MongoDB
                    localField: '_id', // O campo do resultado atual (_id do cliente)
                    foreignField: '_id', // O campo correspondente na coleção 'clientes'
                    as: 'clienteInfo' // O nome do novo array que será criado com os dados do cliente
                }
            },
            // 6. "Desmonta" o array 'clienteInfo' para facilitar o acesso aos dados
            {
                $unwind: '$clienteInfo'
            },
            // 7. Formata a saída para um objeto limpo para o frontend
            {
                $project: {
                    _id: 0, // Remove o campo _id
                    clienteId: '$_id',
                    nome: '$clienteInfo.nome',
                    valor: '$totalFaturado'
                }
            }
        ]);

        res.status(200).json(topClientes);

    } catch (error) {
        console.error("Erro ao buscar top clientes:", error);
        res.status(500).json({ message: 'Erro interno ao buscar dados de clientes.' });
    }
};



const getDemandByNeighborhood = async (req, res) => {
    try {
        const baseQuery = getBaseQuery(req);
        const demand = await Cliente.aggregate([
            {
                $match: {
                    ...baseQuery,
                    'currentDemand.addressData.bairro': { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: '$currentDemand.addressData.bairro',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    bairro: '$_id',
                    count: 1
                }
            }
        ]);
        res.status(200).json(demand);
    } catch (error) {
        console.error("Erro ao buscar demanda por bairro:", error);
        res.status(500).json({ message: 'Erro interno ao buscar dados de demanda.' });
    }
};

// Exportação correta de TODAS as funções
module.exports = {
    getDashboardStats,
    getFaturamentoMensal,
    getResumoFinanceiro,
    getHistoricoFinanceiro,
    getTopServicos,
     getTopClientes,
     getDemandByNeighborhood
};
