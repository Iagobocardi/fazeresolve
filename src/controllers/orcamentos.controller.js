// Arquivo: src/controllers/orcamentos.controller.js

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
const Configuracao = require('../models/configuracao.model.js');


// Regras de validação (podem ser expandidas)
const orcamentoValidationRules = () => {
    return [
        body('status').optional().isIn(['Pendente', 'Aceito', 'Rejeitado', 'Agendado', 'Finalizado']).withMessage('Status inválido').trim(),
        // Adicione outras regras de validação conforme necessário
    ];
};

// Obtém todos os orçamentos
const getAllOrcamentos = async (req, res) => {
    try {
        const { search, statusPagamento, dataInicio, dataFim } = req.query;

        // Estágio inicial do pipeline de agregação
        const pipeline = [
            // =======================================================
            // 👉 CORREÇÃO DE LÓGICA APLICADA AQUI
            // O $lookup deve vir PRIMEIRO, para que os dados do cliente
            // estejam sempre disponíveis para a busca e para a exibição.
            // =======================================================
            {
                $lookup: {
                    from: 'clientes', // nome da sua collection de clientes
                    localField: 'cliente',
                    foreignField: '_id',
                    as: 'clienteInfo'
                }
            },
            // Usamos um unwind mais seguro, que não descarta pedidos
            // se o cliente por acaso for deletado.
            {
                $unwind: {
                    path: '$clienteInfo',
                    preserveNullAndEmptyArrays: true 
                }
            }
        ];

        // 1. Adicionar campos calculados para facilitar a filtragem
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

        // 2. Construir o objeto de filtro ($match)
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

        // Renomeia clienteInfo para cliente para consistência
        const orcamentosComCliente = orcamentos.map(orc => ({
            ...orc,
            cliente: orc.clienteInfo 
        }));

        res.json(orcamentosComCliente);
        
    } catch (error) {
        console.error("Erro ao buscar orçamentos com filtros:", error);
        res.status(500).json({ message: error.message });
    }
};
// Obtém um orçamento por ID
const getOrcamentoById = async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id).populate('cliente', 'nome telefone');
        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        res.status(200).json(orcamento);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar orçamento.' });
    }
};

// Cria um novo orçamento
const createOrcamento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const novoOrcamento = new Orcamento(req.body);
        const orcamentoSalvo = await novoOrcamento.save();
        res.status(201).json(orcamentoSalvo);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar orçamento.' });
    }
};

// Atualiza um orçamento por ID
const updateOrcamento = async (req, res) => {
    try {
        const orcamentoAtualizado = await Orcamento.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!orcamentoAtualizado) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        res.status(200).json(orcamentoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar orçamento.' });
    }
};

// Deleta um orçamento por ID
const deleteOrcamento = async (req, res) => {
    try {
        const orcamentoDeletado = await Orcamento.findByIdAndDelete(req.params.id);
        if (!orcamentoDeletado) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        res.status(200).json({ message: 'Orçamento deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar orçamento.' });
    }
};

// Função para buscar os últimos pedidos para o dashboard
const getRecentOrcamentos = async (req, res) => {
    try {
        // CORREÇÃO APLICADA AQUI
        const orcamentos = await Orcamento.find()
            .populate('cliente', 'nome telefone') // Agora busca o nome E o telefone
            .sort({ data: -1 })
            .limit(10);
        res.status(200).json(orcamentos);
    } catch (error) {
        console.error("ERRO DETALHADO em getRecentOrcamentos:", error);
        res.status(500).json({ message: 'Erro interno ao buscar orçamentos recentes', error: error.message });
    }
};

// Função para atualizar apenas o status de um orçamento
const updateOrcamentoStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const orcamentoId = req.params.id;

        // Chama o serviço para executar a lógica de negócio
        const orcamentoAtualizado = await orcamentoService.atualizarStatus(orcamentoId, status);

        // Envia a resposta HTTP de sucesso
        res.status(200).json(orcamentoAtualizado);

    } catch (error) {
        // Apanha qualquer erro lançado pelo serviço
        console.error("ERRO na rota updateOrcamentoStatus:", error);
        res.status(500).json({ error: error.message || 'Erro ao atualizar status do orçamento.' });
    }
};
const submitOrcamento = async (req, res) => {
    try {
        const { valorProposto } = req.body;
        const orcamentoId = req.params.id;

        // O controller chama o serviço, que contém toda a lógica.
        const orcamentoAtualizado = await orcamentoService.submeterOrcamento(orcamentoId, valorProposto);
        
        // Envia a resposta HTTP.
        res.status(200).json(orcamentoAtualizado);

    } catch (error) {
        // Apanha erros lançados pelo serviço, como 'Valor inválido' ou 'Orçamento não encontrado'.
        console.error("ERRO na rota submitOrcamento:", error);
        // Retorna o status 400 (Bad Request) para erros de validação, o que é mais semântico.
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

        if (!dataAgendamento) {
            return res.status(400).json({ error: 'A data de agendamento é obrigatória.' });
        }
        
        // O controller agora apenas chama o serviço, passando os dados necessários.
        // Toda a lógica complexa está no orcamento.service.js
        const orcamentoAtualizado = await orcamentoService.agendarServico(orcamentoId, dataAgendamento);

        // A única responsabilidade do controller é enviar a resposta HTTP.
        res.status(200).json(orcamentoAtualizado);

    } catch (error) {
        // O erro lançado pelo serviço (ex: 'Orçamento não encontrado') é apanhado aqui.
        console.error("ERRO na rota scheduleOrcamento:", error);
        res.status(500).json({ error: error.message || 'Erro interno ao agendar o serviço.' });
    }
};
const updateNotasInternas = async (req, res) => {
    try {
        const { notasInternas } = req.body;
        const orcamento = await Orcamento.findByIdAndUpdate(
            req.params.id,
            { notasInternas: notasInternas },
            { new: true }
        );

        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        res.status(200).json(orcamento);
    } catch (error) {
        console.error("ERRO em updateNotasInternas:", error);
        res.status(500).json({ error: 'Erro ao atualizar as notas internas.' });
    }
};
const updateStatusPagamento = async (req, res) => {
    try {
        const { statusPagamento } = req.body;
        const allowedStatus = ['Pendente', 'Pago Parcial', 'Pago'];

        if (!statusPagamento || !allowedStatus.includes(statusPagamento)) {
            return res.status(400).json({ error: 'Status de pagamento inválido.' });
        }

        const orcamento = await Orcamento.findById(req.params.id);
        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }

        orcamento.statusPagamento = statusPagamento;
        orcamento.historico.push({ evento: `Status de pagamento alterado para "${statusPagamento}".` });
        
        if (statusPagamento === 'Pago') {
            orcamento.dataPagamento = new Date();
        }
        
        const orcamentoAtualizado = await orcamento.save();
        
        res.status(200).json(orcamentoAtualizado);

    } catch (error) {
        console.error("ERRO em updateStatusPagamento:", error);
        res.status(500).json({ error: 'Erro ao atualizar o status do pagamento.' });
    }
};

const registrarAvaliacao = async (req, res) => {
    try {
        const { id, nota } = req.params;
        const notaNum = parseInt(nota, 10);

        // Validação básica
        if (notaNum < 1 || notaNum > 5) {
            return res.status(400).send('Nota inválida. Apenas valores de 1 a 5 são permitidos.');
        }

        const orcamento = await Orcamento.findById(id);

        if (!orcamento) {
            return res.status(404).send('Pedido não encontrado.');
        }

        // Evita que o cliente avalie duas vezes
        if (orcamento.notaSatisfacao) {
            return res.status(400).send('Este pedido já foi avaliado. Obrigado!');
        }

        orcamento.notaSatisfacao = notaNum;
        await orcamento.save();

        // Envia uma página de agradecimento simples para o cliente
        res.status(200).send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>Obrigado pela sua avaliação!</h1>
                <p>Seu feedback é muito importante para nós.</p>
            </div>
        `);

    } catch (error) {
        console.error("ERRO em registrarAvaliacao:", error);
        res.status(500).send('Ocorreu um erro ao processar sua avaliação.');
    }
};
// Adicione esta nova função ao seu orcamentos.controller.js

const getAgendamentosParaCalendario = async (req, res) => {
     try {
        // 1. Busca todos os orçamentos que estão com o status "Agendado"
        const agendamentos = await Orcamento.find({
            status: 'Agendado',
            dataAgendamento: { $exists: true, $ne: null } // Garante que a data existe
        }).populate('cliente', 'nome'); // Puxa o nome do cliente para o título

        if (!agendamentos) {
            return res.status(200).json([]);
        }

        // 2. Transforma os dados para o formato que o FullCalendar (no frontend) entende
        const eventosFormatados = agendamentos.map(agendamento => {
            // Define um tempo final padrão de 1 hora após o início
            const start = new Date(agendamento.dataAgendamento);
            const end = new Date(start.getTime() + (60 * 60 * 1000)); // Adiciona 1 hora

            return {
                id: agendamento._id, // O ID do pedido
                title: `#${agendamento.shortId} - ${agendamento.cliente?.nome || 'Cliente'}`, // O título do evento
                start: start.toISOString(), // Data de início em formato ISO
                end: end.toISOString(),     // Data de fim em formato ISO
                allDay: false // Indica que é um evento com hora marcada
            };
        });

        res.status(200).json(eventosFormatados);

    } catch (error) {
        console.error("Erro ao buscar agendamentos para o calendário:", error);
        res.status(500).json({ message: 'Erro ao carregar os dados da agenda.' });
    }
};
const adicionarMaterialAoPedido = async (req, res) => {
    try {
        const { orcamentoId } = req.params;
        const { produtoId, quantidade } = req.body;

        // O controller apenas delega a tarefa para o serviço
        const orcamentoAtualizado = await orcamentoService.adicionarMaterial(orcamentoId, produtoId, quantidade);

        res.status(200).json({ message: "Material adicionado com sucesso!", orcamento: orcamentoAtualizado });

    } catch (error) {
        console.error("ERRO na rota adicionarMaterialAoPedido:", error);
        // Retorna um status 400 (Bad Request) para erros de validação (ex: stock insuficiente)
        if (error.message.includes('insuficiente') || error.message.includes('obrigatórios')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Erro interno ao adicionar material ao pedido.' });
    }
};
const updateDetalhesOperacionais = async (req, res) => {
     try {
        const { anotacoesTecnicas, lembreteNotaFiscal } = req.body;
        const orcamento = await Orcamento.findByIdAndUpdate(
            req.params.id,
            { $set: { anotacoesTecnicas, lembreteNotaFiscal } },
            { new: true }
        );
        if (!orcamento) return res.status(404).json({ message: 'Orçamento não encontrado.' });
        res.status(200).json(orcamento);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar detalhes operacionais.', error });
    }
};
const addCustoMaterial = async (req, res) => {
    try {
        const { descricao, valor } = req.body;
        const { id } = req.params; // ID do orçamento

        // 1. Adiciona o custo ao array de custos do orçamento
        const orcamentoAtualizado = await Orcamento.findByIdAndUpdate(
            id,
            { $push: { custosMateriais: { descricao, valor } } },
            { new: true }
        );

        if (!orcamentoAtualizado) {
            return res.status(404).json({ message: 'Orçamento não encontrado.' });
        }

        // =======================================================
        // ==> LÓGICA NOVA PARA CRIAR A DESPESA AUTOMATICAMENTE <==
        // =======================================================
        const novaDespesa = new Despesa({
            descricao: `Material para pedido #${orcamentoAtualizado.shortId}: ${descricao}`,
            valor: valor,
            categoria: 'Material', // Categoria automática
            data: new Date(),
            orcamentoAssociado: id // Ligamos a despesa ao ID do orçamento
        });

        // Salva a nova despesa na coleção de despesas
        await novaDespesa.save();
        
        // Envia a resposta de sucesso com os dados do orçamento atualizado
        res.status(200).json(orcamentoAtualizado);

    } catch (error) {
        console.error("ERRO em addCustoMaterial:", error);
        res.status(500).json({ message: 'Erro ao adicionar custo.', error });
    }
};
const uploadFotoServico = async (req, res) => {
    try {
        const orcamentoId = req.params.id;
        const { descricao } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum ficheiro enviado.' });
        }

        const orcamento = await Orcamento.findById(orcamentoId);
        if (!orcamento) {
            return res.status(404).json({ message: 'Orçamento não encontrado.' });
        }

        // Constrói a URL pública do ficheiro
        const fotoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        orcamento.fotosServico.push({
            url: fotoUrl,
            descricao: descricao || 'Foto do serviço'
        });

        await orcamento.save();
        res.status(200).json(orcamento);

    } catch (error) {
        console.error("ERRO em uploadFotoServico:", error);
        res.status(500).json({ message: 'Erro ao fazer upload da foto.' });
    }
};
const preencherTemplate = (templatePath, dados) => {
    let html = fs.readFileSync(templatePath, 'utf8');

    // Função recursiva que encontra e substitui todos os placeholders, incluindo os aninhados.
    const substituirPlaceholders = (template, dataObject, prefix = '') => {
        for (const key in dataObject) {
            if (Object.prototype.hasOwnProperty.call(dataObject, key)) {
                const valor = dataObject[key];
                const placeholder = `{{${prefix}${key}}}`;
                
                if (typeof valor === 'object' && valor !== null && !Array.isArray(valor)) {
                    template = substituirPlaceholders(template, valor, `${prefix}${key}.`);
                } else {
                    template = template.replace(new RegExp(placeholder, 'g'), valor);
                }
            }
        }
        return template;
    };

    return substituirPlaceholders(html, dados);
};

const gerarFaturaPDF = async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id).populate('cliente', 'nome telefone');
        if (!orcamento) {
            return res.status(404).send('Orçamento não encontrado.');
        }

        const config = await Configuracao.obterConfiguracao();

        // --- INÍCIO DA NOVA LÓGICA DA LOGO ---

        let logoHtml = ''; // Começa como uma string vazia

        // Verifica se a configuração e a URL da logo existem
        if (config && config.logoUrl) {
            try {
                // 1. Extrai apenas o nome do arquivo da URL completa
                const fileName = path.basename(config.logoUrl);

                // 2. Cria o caminho completo para o arquivo no disco do servidor
                const filePath = path.join(__dirname, '..', '..', 'public', 'uploads', fileName);

                // 3. Verifica se o arquivo realmente existe antes de tentar lê-lo
                if (fs.existsSync(filePath)) {
                    // 4. Lê o arquivo da imagem para a memória
                    const imageBuffer = fs.readFileSync(filePath);
                    
                    // 5. Converte a imagem para Base64
                    const base64Image = imageBuffer.toString('base64');
                    
                    // 6. Descobre o tipo da imagem (png, jpeg, etc.) pelo nome do arquivo
                    const mimeType = path.extname(fileName).slice(1);
                    
                    // 7. Cria a "Data URI" completa e a tag <img>
                    const dataUri = `data:image/${mimeType};base64,${base64Image}`;
                    logoHtml = `<img src="${dataUri}" alt="Logo da Empresa" class="logo">`;
                }
            } catch (err) {
                console.error("Erro ao ler o arquivo da logo para o PDF:", err);
                // Se der erro, a logoHtml continua vazia e a fatura é gerada sem ela.
            }
        }

        const dadosParaTemplate = {
            orcamento: orcamento.toObject(),
            config: config.toObject(),
            dataEmissao: new Date().toLocaleDateString('pt-BR'),
            valorPropostoFormatado: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valorProposto || 0),
            logoHtml: logoHtml // 3. Adicione a variável com o HTML da logo aos dados.
        };

        const templatePath = path.join(__dirname, '..', 'templates', 'fatura-template.html');
        const html = preencherTemplate(templatePath, dadosParaTemplate);
        
        const pdfBuffer = await pdfService.generatePdf(html);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=fatura-${orcamento.shortId}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error("ERRO em gerarFaturaPDF:", error);
        res.status(500).json({ message: 'Erro ao gerar o PDF da fatura.' });
    }
};

const gerarOrcamentoPDF = async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id).populate('cliente', 'nome telefone');
        if (!orcamento) {
            return res.status(404).send('Orçamento não encontrado.');
        }

        const config = await Configuracao.obterConfiguracao();

        // --- LÓGICA DA LOGO (IDÊNTICA À DA FATURA) ---
        let logoHtml = '';
        if (config && config.logoUrl) {
            try {
                const fileName = path.basename(config.logoUrl);
                const filePath = path.join(__dirname, '..', '..', 'public', 'uploads', fileName);

                if (fs.existsSync(filePath)) {
                    const imageBuffer = fs.readFileSync(filePath);
                    const base64Image = imageBuffer.toString('base64');
                    const mimeType = path.extname(fileName).slice(1);
                    const dataUri = `data:image/${mimeType};base64,${base64Image}`;
                    logoHtml = `<img src="${dataUri}" alt="Logo da Empresa" class="logo">`;
                }
            } catch (err) {
                console.error("Erro ao ler o arquivo da logo para o orçamento:", err);
            }
        }
        // --- FIM DA LÓGICA DA LOGO ---

        const dadosParaTemplate = {
            orcamento: orcamento.toObject(),
            config: config.toObject(),
            dataEmissao: new Date().toLocaleDateString('pt-BR'),
            valorPropostoFormatado: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valorProposto || 0),
            logoHtml: logoHtml // Passamos o HTML da logo para o template
        };

        const templatePath = path.join(__dirname, '..', 'templates', 'orcamento-template.html');
        const html = preencherTemplate(templatePath, dadosParaTemplate);
        
        const pdfBuffer = await pdfService.generatePdf(html);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=orcamento-${orcamento.shortId}.pdf`);
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('Erro ao gerar PDF do orçamento:', error);
        res.status(500).send('Erro interno do servidor');
    }
};

const adicionarPagamento = async (req, res) => {
    try {
        const { valor, metodo, observacao } = req.body;
        const orcamentoId = req.params.id;

        // Validação simples dos dados de entrada
        if (!valor || valor <= 0) {
            return res.status(400).json({ message: 'O valor do pagamento deve ser maior que zero.' });
        }

        const orcamento = await Orcamento.findById(orcamentoId);
        if (!orcamento) {
            return res.status(404).json({ message: 'Orçamento não encontrado.' });
        }

        // Adiciona o novo pagamento ao array de pagamentos
        orcamento.pagamentos.push({ valor, metodo, observacao });

        // Salva as alterações no banco de dados
        await orcamento.save();

        // Retorna o orçamento completo e atualizado
        res.status(200).json(orcamento);

    } catch (error) {
        console.error("Erro ao adicionar pagamento:", error);
        res.status(500).json({ message: 'Erro interno ao adicionar pagamento.' });
    }
};

// =======================================================
// 👉 NOVA FUNÇÃO PARA REMOVER PAGAMENTO
// =======================================================
const removerPagamento = async (req, res) => {
    try {
        const { id: orcamentoId, pagamentoId } = req.params;

        const orcamento = await Orcamento.findById(orcamentoId);
        if (!orcamento) {
            return res.status(404).json({ message: 'Orçamento não encontrado.' });
        }

        // Encontra o pagamento específico e o remove do array
        // O método .pull do Mongoose é perfeito para isso
        orcamento.pagamentos.pull({ _id: pagamentoId });

        // Salva as alterações
        await orcamento.save();

        // Retorna o orçamento atualizado
        res.status(200).json(orcamento);

    } catch (error) {
        console.error("Erro ao remover pagamento:", error);
        res.status(500).json({ message: 'Erro interno ao remover pagamento.' });
    }
};
const getAgendadosParaCalendario = async (req, res) => {
    try {
        // 1. Busca no banco todos os orçamentos com status 'Agendado' e que tenham uma data
        const orcamentosAgendados = await Orcamento.find({
    status: 'Agendado',
    dataAgendamento: { $exists: true, $ne: null }
})
.populate('cliente', 'nome telefone')
.select('dataAgendamento descricao cliente');

        // 2. Transforma os dados do MongoDB para o formato que o FullCalendar espera
        const eventos = orcamentosAgendados.map(orcamento => {
            // Monta um título descritivo para o evento no calendário
            const tituloEvento = `Serviço para: ${orcamento.cliente?.nome || 'Cliente não identificado'}`;

            return {
                id: orcamento._id,          // ID do evento
                title: tituloEvento,        // O que vai aparecer escrito no evento
                start: orcamento.dataAgendamento, // Data e hora de início
                // end: ...  // Você pode adicionar uma data de término se tiver essa informação
            };
        });

        // 3. Envia a lista de eventos formatada como resposta
        res.status(200).json(eventos);

    } catch (error) {
        console.error("Erro ao buscar eventos para o calendário:", error);
        res.status(500).json({ message: 'Erro interno ao buscar agendamentos.' });
    }
};
const marcarComoPago = async (req, res) => {
    try {
        const pedido = await Orcamento.findById(req.params.id);
        if (!pedido) {
            return res.status(404).json({ message: "Pedido não encontrado." });
        }

        const valorTotal = pedido.valorProposto || 0;
        const totalJaPago = pedido.pagamentos.reduce((acc, p) => acc + p.valor, 0);
        const valorRestante = valorTotal - totalJaPago;

        if (valorRestante > 0) {
            pedido.pagamentos.push({
                valor: valorRestante,
                metodo: 'Automático',
                observacao: 'Pagamento liquidado pela ação rápida.'
            });
        }
        
        pedido.statusPagamento = 'Pago';
        pedido.historico.push({ evento: `Status do pagamento alterado para "Pago" (Ação Rápida).` });

        const pedidoAtualizado = await pedido.save();
        res.status(200).json(pedidoAtualizado);

    } catch (error) {
        console.error("Erro ao marcar como pago:", error);
        res.status(500).json({ message: "Ocorreu um erro no servidor." });
    }
};
const attachInvoice = async (req, res) => {
    try {
        const { imageUrl } = req.body;
        const { id } = req.params;

        if (!imageUrl) {
            return res.status(400).json({ message: 'O URL da imagem é obrigatório.' });
        }

        const orcamento = await Orcamento.findByIdAndUpdate(
            id,
            { notaFiscalUrl: imageUrl },
            { new: true, runValidators: true }
        );

        if (!orcamento) {
            return res.status(404).json({ message: 'Orçamento não encontrado.' });
        }

        res.status(200).json({ message: 'Nota fiscal anexada com sucesso!', orcamento });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao anexar nota fiscal.', error: error.message });
    }
};
const getPedidosPorCliente = async (req, res) => {
    try {
        // 1. Pega o ID do cliente a partir dos parâmetros da URL
        const { clienteId } = req.params;

        // 2. Busca no banco de dados todos os orçamentos onde o campo 'cliente' corresponde ao ID
        // O .sort({ data: -1 }) mostra os pedidos mais recentes primeiro.
        const pedidosDoCliente = await Orcamento.find({ cliente: clienteId }).sort({ data: -1 });

        // 3. Retorna a lista de pedidos encontrados (pode ser uma lista vazia, o que está correto)
        res.status(200).json(pedidosDoCliente);

    } catch (error) {
        console.error("Erro ao buscar pedidos por cliente:", error);
        res.status(500).json({ message: "Erro ao buscar os pedidos do cliente." });
    }
};

// Exporta TODAS as funções que as rotas utilizam.
module.exports = {
    orcamentoValidationRules,
    getAllOrcamentos,
    getOrcamentoById,
    createOrcamento,
    updateOrcamento,
    deleteOrcamento,
    getRecentOrcamentos,
    updateOrcamentoStatus,  
    submitOrcamento,
    scheduleOrcamento,
    updateNotasInternas,
    updateStatusPagamento,
    registrarAvaliacao,
    getAgendamentosParaCalendario,
    adicionarMaterialAoPedido,
    updateDetalhesOperacionais,
    addCustoMaterial,
    uploadFotoServico,
    gerarFaturaPDF,
    gerarOrcamentoPDF,
    adicionarPagamento,
    removerPagamento,
    getAgendadosParaCalendario,
    marcarComoPago,
    attachInvoice,
    getPedidosPorCliente
};