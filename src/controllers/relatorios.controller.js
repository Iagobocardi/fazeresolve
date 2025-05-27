// Arquivo: src/controllers/relatorios.controller.js
const Servico = require('../models/servico.model');
const Financeiro = require('../models/financeiro.model');
const Orcamento = require('../models/orcamento.model');
const Agendamento = require('../models/agendamento.model');
const Cliente = require('../models/cliente.model'); // Importe o model de Cliente

// Função para gerar relatório de serviços (PDF)
exports.gerarRelatorioServicosPDF = async (req, res) => {
    try {
        const servicos = await Servico.find().populate('cliente'); // Popula o cliente
        // Lógica para gerar o PDF com base nos dados dos serviços
        // Você pode usar a biblioteca pdfmake para gerar o PDF
        // Exemplo básico com pdfmake (instale: npm install pdfmake)
        const pdfMake = require('pdfmake');
        const fs = require('fs');

        const docDefinition = {
            content: [
                { text: 'Relatório de Serviços', style: 'header' },
                {
                    table: {
                        body: [
                            ['Tipo de Serviço', 'Status', 'Valor', 'Data Solicitação', 'Data Conclusão', 'Cliente'],
                            ...servicos.map(servico => [
                                servico.tipoServico,
                                servico.status,
                                servico.valorServico,
                                servico.dataSolicitacao.toLocaleDateString(),
                                servico.dataConclusao ? servico.dataConclusao.toLocaleDateString() : 'Pendente',
                                servico.cliente ? servico.cliente.nome : 'N/A' // Acessa o nome do cliente
                            ]),
                        ],
                    },
                },
            ],
            styles: {
                header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
            },
        };

        const pdfDoc = new pdfMake().createPdfKitDocument(docDefinition);
        const pdfPath = 'relatorio_servicos.pdf';
        pdfDoc.pipe(fs.createWriteStream(pdfPath));
        pdfDoc.end();

        // Envia o arquivo PDF como resposta
        res.download(pdfPath, 'relatorio_servicos.pdf', () => {
            // Remove o arquivo após o envio
            fs.unlinkSync(pdfPath);
        });

    } catch (error) {
        console.error('Erro ao gerar relatório de serviços (PDF):', error);
        res.status(500).json({ error: 'Erro ao gerar relatório de serviços.' });
    }
};

// Função para gerar relatório financeiro (PDF)
exports.gerarRelatorioFinanceiroPDF = async (req, res) => {
    try {
        const registros = await Financeiro.find().populate('servico');
        // Lógica para gerar o PDF com os dados financeiros
         const pdfMake = require('pdfmake');
        const fs = require('fs');

        const docDefinition = {
            content: [
                { text: 'Relatório Financeiro', style: 'header' },
                {
                    table: {
                        body: [
                            ['Valor Recebido', 'Forma Pagamento', 'Taxa Aplicada', 'Serviço', 'Data Pagamento'],
                            ...registros.map(registro => [
                                registro.valorRecebido,
                                registro.formaPagamento,
                                registro.taxaAplicada || 'N/A',
                                registro.servico ? registro.servico.tipoServico : 'N/A', // Acessa o tipo de serviço
                                registro.dataPagamento.toLocaleDateString(),
                            ]),
                        ],
                    },
                },
            ],
            styles: {
                header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
            },
        };

        const pdfDoc = new pdfMake().createPdfKitDocument(docDefinition);
        const pdfPath = 'relatorio_financeiro.pdf';
        pdfDoc.pipe(fs.createWriteStream(pdfPath));
        pdfDoc.end();

        // Envia o arquivo PDF como resposta
        res.download(pdfPath, 'relatorio_financeiro.pdf', () => {
            // Remove o arquivo após o envio
            fs.unlinkSync(pdfPath);
        });

    } catch (error) {
        console.error('Erro ao gerar relatório financeiro (PDF):', error);
        res.status(500).json({ error: 'Erro ao gerar relatório financeiro.' });
    }
};

// Função para gerar relatório de orçamentos (PDF)
exports.gerarRelatorioOrcamentosPDF = async (req, res) => {
    try {
        const orcamentos = await Orcamento.find().populate('servico');
        // Lógica para gerar o PDF com os dados dos orçamentos
        const pdfMake = require('pdfmake');
        const fs = require('fs');

        const docDefinition = {
            content: [
                { text: 'Relatório de Orçamentos', style: 'header' },
                {
                    table: {
                        body: [
                            ['Status', 'Data', 'Valor Proposto', 'Serviço'],
                            ...orcamentos.map(orcamento => [
                                orcamento.status,
                                orcamento.data.toLocaleDateString(),
                                orcamento.valorProposto,
                                orcamento.servico ? orcamento.servico.tipoServico : 'N/A', // Acessa o tipo de serviço
                            ]),
                        ],
                    },
                },
            ],
            styles: {
                header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
            },
        };

        const pdfDoc = new pdfMake().createPdfKitDocument(docDefinition);
        const pdfPath = 'relatorio_orcamentos.pdf';
        pdfDoc.pipe(fs.createWriteStream(pdfPath));
        pdfDoc.end();

        // Envia o arquivo PDF como resposta
        res.download(pdfPath, 'relatorio_orcamentos.pdf', () => {
            // Remove o arquivo após o envio
            fs.unlinkSync(pdfPath);
        });

    } catch (error) {
        console.error('Erro ao gerar relatório de orçamentos (PDF):', error);
        res.status(500).json({ error: 'Erro ao gerar relatório de orçamentos.' });
    }
};

// Função para gerar relatório de agendamentos
exports.gerarRelatorioAgendamentos = async (req, res) => {
  try {
    const agendamentos = await Agendamento.find().populate('servico').populate('cliente'); // Popula servico e cliente

    const pdfMake = require('pdfmake');
    const fs = require('fs');

    const docDefinition = {
      content: [
        { text: 'Relatório de Agendamentos', style: 'header' },
        {
          table: {
            body: [
              ['Data Início', 'Data Fim', 'Serviço', 'Cliente', 'Observações'],
              ...agendamentos.map((agendamento) => [
                agendamento.dataHoraInicio.toLocaleString(),
                agendamento.dataHoraFim.toLocaleString(),
                agendamento.servico ? agendamento.servico.tipoServico : 'N/A', // Acessa o tipo de serviço
                agendamento.cliente ? agendamento.cliente.nome : 'N/A',       // Acessa o nome do cliente
                agendamento.observacoes || 'N/A',
              ]),
            ],
          },
        },
      ],
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      },
    };

    const pdfDoc = new pdfMake().createPdfKitDocument(docDefinition);
    const pdfPath = 'relatorio_agendamentos.pdf';
    pdfDoc.pipe(fs.createWriteStream(pdfPath));
    pdfDoc.end();

    res.download(pdfPath, 'relatorio_agendamentos.pdf', () => {
      fs.unlinkSync(pdfPath);
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de agendamentos (PDF):', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de agendamentos.' });
  }
};