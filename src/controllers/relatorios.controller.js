// Importa os models necessários do banco de dados
const Servico = require('../models/servico.model');
const Financeiro = require('../models/financeiro.model');
const Orcamento = require('../models/orcamento.model');
const Agendamento = require('../models/agendamento.model');

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

/**
 * Função genérica para criar e enviar um PDF como resposta de forma segura
 */
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

// Gera relatório de Serviços em PDF
exports.gerarRelatorioServicosPDF = async (req, res) => {
    try {
        const servicos = await Servico.find().populate('cliente');
        
        // Mapeia os dados de forma segura, verificando se cada campo existe
        const bodyData = servicos.map(servico => [
            servico.tipoServico || 'Não informado',
            servico.status || 'N/A',
            servico.valorServico ? servico.valorServico.toFixed(2) : '0.00',
            servico.dataSolicitacao ? new Date(servico.dataSolicitacao).toLocaleDateString('pt-BR') : 'N/A',
            servico.cliente ? servico.cliente.nome : 'Cliente não associado'
        ]);

        const docDefinition = {
            content: [
                { text: 'Relatório de Serviços', style: 'header' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', 'auto', 'auto', 'auto', '*'],
                        body: [['Tipo de Serviço', 'Status', 'Valor', 'Data Solicitação', 'Cliente'], ...bodyData]
                    }
                }
            ],
            styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] } }
        };
        sendPdfResponse(res, docDefinition, 'relatorio_servicos.pdf');
    } catch (error) {
        // Este console.error é a sua ferramenta mais importante para depuração!
        console.error('Erro detalhado ao buscar dados para relatório de serviços:', error);
        res.status(500).json({ error: 'Erro ao buscar dados para relatório.' });
    }
};

// Gera relatório Financeiro em PDF
exports.gerarRelatorioFinanceiroPDF = async (req, res) => {
    try {
        const registros = await Financeiro.find().populate({
            path: 'servico',
            populate: { path: 'cliente' }
        });

        const bodyData = registros.map(registro => [
            registro.data ? new Date(registro.data).toLocaleDateString('pt-BR') : 'N/A',
            registro.servico && registro.servico.cliente ? registro.servico.cliente.nome : 'N/A',
            registro.formaPagamento || 'Não informada',
            registro.valorRecebido ? registro.valorRecebido.toFixed(2) : '0.00'
        ]);

        const docDefinition = {
            content: [
                { text: 'Relatório Financeiro', style: 'header' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', '*', 'auto', 'auto'],
                        body: [['Data', 'Cliente', 'Forma de Pagamento', 'Valor Recebido'], ...bodyData]
                    }
                }
            ],
            styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] } }
        };
        sendPdfResponse(res, docDefinition, 'relatorio_financeiro.pdf');
    } catch (error) {
        console.error('Erro detalhado ao buscar dados para relatório financeiro:', error);
        res.status(500).json({ error: 'Erro ao buscar dados para relatório.' });
    }
};

// Gera relatório de Orçamentos em PDF
exports.gerarRelatorioOrcamentosPDF = async (req, res) => {
    try {
        const orcamentos = await Orcamento.find().populate('servico').populate('cliente');
        const bodyData = orcamentos.map(orcamento => [
            orcamento.cliente ? orcamento.cliente.nome : 'N/A',
            orcamento.servico ? orcamento.servico.tipoServico : 'N/A',
            orcamento.valorProposto ? orcamento.valorProposto.toFixed(2) : '0.00',
            orcamento.status || 'N/A',
            orcamento.validade ? new Date(orcamento.validade).toLocaleDateString('pt-BR') : 'N/A'
        ]);

        const docDefinition = {
            content: [
                { text: 'Relatório de Orçamentos', style: 'header' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', '*', 'auto', 'auto', 'auto'],
                        body: [['Cliente', 'Serviço', 'Valor Proposto', 'Status', 'Validade'], ...bodyData]
                    }
                }
            ],
            styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] } }
        };
        sendPdfResponse(res, docDefinition, 'relatorio_orcamentos.pdf');
    } catch (error) {
        console.error('Erro detalhado ao buscar dados para relatório de orçamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar dados para relatório.' });
    }
};

// Gera relatório de Agendamentos em PDF
exports.gerarRelatorioAgendamentos = async (req, res) => {
    try {
        const agendamentos = await Agendamento.find().populate('servico').populate('cliente');
        const bodyData = agendamentos.map(agendamento => [
            agendamento.dataHoraInicio ? new Date(agendamento.dataHoraInicio).toLocaleString('pt-BR') : 'N/A',
            agendamento.servico ? agendamento.servico.tipoServico : 'N/A',
            agendamento.cliente ? agendamento.cliente.nome : 'N/A',
            agendamento.status || 'N/A'
        ]);

        const docDefinition = {
            content: [
                { text: 'Relatório de Agendamentos', style: 'header' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', '*', '*', 'auto'],
                        body: [['Data/Hora', 'Serviço', 'Cliente', 'Status'], ...bodyData]
                    }
                }
            ],
            styles: { header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] } }
        };
        sendPdfResponse(res, docDefinition, 'relatorio_agendamentos.pdf');
    } catch (error) {
        console.error('Erro detalhado ao buscar dados para relatório de agendamentos:', error);
        res.status(500).json({ error: 'Erro ao buscar dados para relatório.' });
    }
};
