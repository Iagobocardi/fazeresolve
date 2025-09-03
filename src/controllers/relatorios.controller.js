// Importa os services e models necessários
const relatoriosService = require('../services/relatorios.service');
const Servico = require('../models/servico.model');
const Financeiro = require('../models/financeiro.model');
const Orcamento = require('../models/orcamento.model');
const Agendamento = require('../models/agendamento.model');
const Produto = require('../models/produto.model');
const MovimentoEstoque = require('../models/movimentoEstoque.model');
const mongoose = require('mongoose');

// Importa e configura o pdfmake para uso no servidor
const Pdfmake = require('pdfmake');
const fonts = {
    Roboto: {
        normal: 'node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf',
        bold: 'node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf',
        italics: 'node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf',
        bolditalics: 'node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf'
    }
};
const printer = new Pdfmake(fonts);

const sendPdfResponse = (res, docDefinition, fileName) => {
    try {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=${fileName}`);
        pdfDoc.pipe(res);
        pdfDoc.end();
    } catch (error) {
        console.error(`Erro CRÍTICO ao gerar o stream do PDF (${fileName}):`, error);
        res.status(500).json({ error: `Erro crítico ao gerar o arquivo PDF.` });
    }
};

const gerarRelatorioServicosPDF = async (req, res) => {
    try {
        const bodyData = await relatoriosService.getServicosReportData();
        const docDefinition = {
            content: [ { text: 'Relatório de Serviços', style: 'header' }, { table: { headerRows: 1, widths: ['*', 'auto', 'auto', 'auto', '*'], body: [['Tipo de Serviço', 'Status', 'Valor', 'Data Solicitação', 'Cliente'], ...bodyData] } } ],
            styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] } }
        };
        sendPdfResponse(res, docDefinition, 'relatorio_servicos.pdf');
    } catch (error) {
        console.error('Erro detalhado ao buscar dados para relatório de serviços:', error);
        res.status(500).json({ error: 'Erro ao buscar dados para relatório.' });
    }
};

const getValorTotalEstoque = async (req, res) => {
    try {
        const { contaId } = req.user;
        const result = await Produto.aggregate([
            { $match: { contaId: new mongoose.Types.ObjectId(contaId) } },
            { $group: { _id: null, totalValue: { $sum: { $multiply: ["$quantidadeEmEstoque", "$custoUnitario"] } } } }
        ]);
        const totalValue = result.length > 0 ? result[0].totalValue : 0;
        res.status(200).json({ totalValue });
    } catch (error) {
        console.error("Erro ao calcular valor total do estoque:", error);
        res.status(500).json({ message: "Erro ao calcular valor total do estoque." });
    }
};

const getNiveisEstoque = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { sort = 'desc' } = req.query;
        const sortOrder = sort === 'asc' ? 1 : -1;
        const produtos = await Produto.find({ contaId }).sort({ quantidadeEmEstoque: sortOrder }).limit(50);
        res.status(200).json(produtos);
    } catch (error) {
        console.error("Erro ao buscar níveis de estoque:", error);
        res.status(500).json({ message: "Erro ao buscar níveis de estoque." });
    }
};

const getHistoricoProduto = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { produtoId } = req.params;
        const produto = await Produto.findOne({ _id: produtoId, contaId });
        if (!produto) {
            return res.status(404).json({ message: "Produto não encontrado ou não pertence a esta conta." });
        }
        const historico = await MovimentoEstoque.find({ produto: produtoId }).sort({ createdAt: -1 });
        res.status(200).json(historico);
    } catch (error) {
        console.error("Erro ao buscar histórico do produto:", error);
        res.status(500).json({ message: "Erro ao buscar histórico do produto." });
    }
};

const gerarRelatorioReceitaVsDespesa = async (req, res) => {
    try {
        const data = await relatoriosService.getRevenueVsExpensesData();
        const revenueDetails = data.revenueRecords.map(r => [ new Date(r.dataPagamento).toLocaleDateString('pt-BR'), r.formaPagamento, `R$ ${r.valorRecebido.toFixed(2)}` ]);
        const expenseDetails = data.expenseRecords.map(e => [ new Date(e.data).toLocaleDateString('pt-BR'), e.descricao, e.categoria, `R$ ${e.valor.toFixed(2)}` ]);
        const docDefinition = {
            content: [
                { text: 'Relatório de Receitas vs. Despesas', style: 'header' },
                { text: 'Resumo Financeiro', style: 'subheader' },
                { style: 'summaryTable', table: { widths: ['*', '*'], body: [ ['Receita Total', `R$ ${data.totalRevenue.toFixed(2)}`], ['Despesa Total', `R$ ${data.totalExpenses.toFixed(2)}`], [{ text: 'Resultado Líquido', bold: true }, { text: `R$ ${data.netResult.toFixed(2)}`, bold: true }] ] }, layout: 'noBorders' },
                { text: 'Detalhes de Receitas', style: 'subheader', margin: [0, 20, 0, 10] },
                { table: { headerRows: 1, widths: ['auto', '*', 'auto'], body: [['Data', 'Forma de Pagamento', 'Valor'], ...revenueDetails] } },
                { text: 'Detalhes de Despesas', style: 'subheader', margin: [0, 20, 0, 10] },
                { table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto'], body: [['Data', 'Descrição', 'Categoria', 'Valor'], ...expenseDetails] } }
            ],
            styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] }, subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] }, summaryTable: { margin: [0, 5, 0, 15] } }
        };
        sendPdfResponse(res, docDefinition, 'relatorio_receita_vs_despesa.pdf');
    } catch (error) {
        console.error('Erro detalhado ao gerar relatório de receita vs. despesa:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
};

const gerarRelatorioSatisfacaoCliente = async (req, res) => {
    try {
        const data = await relatoriosService.getCustomerSatisfactionReportData();
        const docDefinition = {
            content: [
                { text: 'Relatório de Satisfação do Cliente', style: 'header' },
                { text: 'Resumo Geral', style: 'subheader' },
                { style: 'summaryTable', table: { widths: ['*', '*'], body: [ ['Total de Avaliações', data.totalRatings], [{ text: 'Média Geral de Satisfação', bold: true }, { text: `${data.averageRating} / 5.00`, bold: true }] ] }, layout: 'noBorders' },
                { text: 'Detalhes das Avaliações', style: 'subheader', margin: [0, 20, 0, 10] },
                { table: { headerRows: 1, widths: ['auto', 'auto', 'auto', '*'], body: [['Pedido ID', 'Cliente', 'Nota', 'Feedback'], ...data.bodyData] } }
            ],
            styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] }, subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] }, summaryTable: { margin: [0, 5, 0, 15] } }
        };
        if (data.totalRatings === 0) {
            docDefinition.content.push({ text: 'Nenhuma avaliação de cliente encontrada no período.', italics: true, margin: [0, 20] });
            docDefinition.content.splice(1, 2);
        }
        sendPdfResponse(res, docDefinition, 'relatorio_satisfacao_cliente.pdf');
    } catch (error) {
        console.error('Erro detalhado ao gerar relatório de satisfação:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório.' });
    }
};

const gerarRelatorioFinanceiroPDF = async (req, res) => {
    try {
        const bodyData = await relatoriosService.getFinanceiroReportData();
        const docDefinition = {
            content: [ { text: 'Relatório Financeiro', style: 'header' }, { table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto'], body: [['Data', 'Cliente', 'Forma de Pagamento', 'Valor Recebido'], ...bodyData] } } ],
            styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] } }
        };
        sendPdfResponse(res, docDefinition, 'relatorio_financeiro.pdf');
    } catch (error) {
        console.error('Erro detalhado ao buscar dados para relatório financeiro:', error);
        res.status(500).json({ error: 'Erro ao buscar dados para relatório.' });
    }
};

const gerarRelatorioOrcamentosPDF = async (req, res) => {
    try {
        const bodyData = await relatoriosService.getOrcamentosReportData();
        const docDefinition = {
            content: [ { text: 'Relatório de Orçamentos', style: 'header' }, { table: { headerRows: 1, widths: ['*', '*', 'auto', 'auto', 'auto'], body: [['Cliente', 'Serviço', 'Valor Proposto', 'Status', 'Validade'], ...bodyData] } } ],
            styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] } }
        };
        sendPdfResponse(res, docDefinition, 'relatorio_orcamentos.pdf');
    } catch (error) {
        console.error('Erro detalhado ao buscar dados para relatório de orçamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar dados para relatório.' });
    }
};

const gerarRelatorioAgendamentos = async (req, res) => {
    try {
        const bodyData = await relatoriosService.getAgendamentosReportData();
        const docDefinition = {
            content: [ { text: 'Relatório de Agendamentos', style: 'header' }, { table: { headerRows: 1, widths: ['auto', '*', '*', 'auto'], body: [['Data/Hora', 'Serviço', 'Cliente', 'Status'], ...bodyData] } } ],
            styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] } }
        };
        sendPdfResponse(res, docDefinition, 'relatorio_agendamentos.pdf');
    } catch (error) {
        console.error('Erro detalhado ao buscar dados para relatório de agendamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar dados para relatório.' });
    }
};

const getTicketMedioMensal = async (req, res) => {
    try {
        const { contaId } = req.user;
        const dozeMesesAtras = new Date();
        dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 12);

        const result = await Orcamento.aggregate([
            {
                $match: {
                    contaId: new mongoose.Types.ObjectId(contaId),
                    status: 'Finalizado',
                    dataFinalizacao: { $gte: dozeMesesAtras }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$dataFinalizacao" },
                        month: { $month: "$dataFinalizacao" }
                    },
                    ticketMedio: { $avg: "$valorProposto" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            {
                $project: {
                    _id: 0,
                    mes: {
                        $concat: [
                            { $toString: "$_id.year" },
                            "-",
                            { $toString: { $cond: { if: { $lt: ["$_id.month", 10] }, then: { $concat: ["0", { $toString: "$_id.month" }] }, else: { $toString: "$_id.month" } } } }
                        ]
                    },
                    ticketMedio: "$ticketMedio"
                }
            }
        ]);

        res.status(200).json(result);
    } catch (error) {
        console.error("Erro ao calcular ticket médio mensal:", error);
        res.status(500).json({ message: "Erro ao calcular ticket médio mensal." });
    }
};

module.exports = {
    gerarRelatorioServicosPDF,
    gerarRelatorioFinanceiroPDF,
    gerarRelatorioOrcamentosPDF,
    gerarRelatorioAgendamentos,
    gerarRelatorioReceitaVsDespesa,
    gerarRelatorioSatisfacaoCliente,
    getValorTotalEstoque,
    getNiveisEstoque,
    getHistoricoProduto,
    getTicketMedioMensal,
};
