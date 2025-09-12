// Arquivo: src/controllers/orcamentos.controller.js

const mongoose = require('mongoose');
const Orcamento = require('../models/orcamento.model');
const { validationResult, body } = require('express-validator');
const whatsappService = require('../services/whatsapp.service');
const Produto = require('../models/produto.model');
const MovimentoEstoque = require('../models/movimentoEstoque.model'); 
const Despesa = require('../models/despesa.model');
const Transacao = require('../models/transacao.model');
const pdfService = require('../services/pdf.service');
const fs = require('fs');
const path = require('path');   
const orcamentoService = require('../services/orcamento.service');
const Configuracao = require('../models/configuracao.model.js');
const Cliente = require('../models/cliente.model.js');
const Conta = require('../models/conta.model.js');


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
        const { contaId } = req.user;
        const { search, statusPagamento, dataInicio, dataFim } = req.query;

        // --- DEBUGGING INÍCIO ---
        const debugLog = (filename, data) => {
            fs.writeFileSync(`./${filename}`, JSON.stringify(data, null, 2));
        };

        // Estágio inicial do pipeline de agregação
        const pipeline = [
            {
                $match: { contaId: new mongoose.Types.ObjectId(contaId) }
            }
        ];

        const step1_result = await Orcamento.aggregate(pipeline);
        debugLog('debug_step1_match.json', { count: step1_result.length, data: step1_result.map(d => ({ _id: d._id, cliente: d.cliente })) });

        pipeline.push({
            $lookup: {
                from: 'clientes', // nome da sua collection de clientes
                localField: 'cliente',
                foreignField: '_id',
                as: 'clienteInfo'
            }
        });
        pipeline.push({
            $unwind: {
                path: '$clienteInfo',
                preserveNullAndEmptyArrays: true 
            }
        });

        const step2_result = await Orcamento.aggregate(pipeline);
        debugLog('debug_step2_lookup.json', { count: step2_result.length, data: step2_result.map(d => ({ _id: d._id, clienteInfo: d.clienteInfo ? { _id: d.clienteInfo._id, nome: d.clienteInfo.nome } : null })) });

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

        debugLog('debug_final_response.json', { count: orcamentosComCliente.length, data: orcamentosComCliente });
        // --- DEBUGGING FIM ---

        res.json(orcamentosComCliente);
        
    } catch (error) {
        console.error("Erro ao buscar orçamentos com filtros:", error);
        fs.writeFileSync('./debug_error.json', JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
        res.status(500).json({ message: error.message });
    }
};
// Obtém um orçamento por ID
const getOrcamentoById = async (req, res) => {
    try {
        const { contaId } = req.user;
        const orcamento = await Orcamento.findOne({ _id: req.params.id, contaId })
            .populate('cliente', 'nome telefone endereco')
            .populate('materiaisUsados.produto'); // Popula os detalhes do produto

        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(orcamento);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar orçamento.' });
    }
};

const calcularPrecoSugerido = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { pedidoId } = req.params;
        const { horasEstimadas, custoHora, margemLucro, custosTerceiros } = req.body;

        // --- INÍCIO DA CORREÇÃO ---
        // Busca o orçamento e já calcula o custo dos materiais via agregação, que é mais eficiente.
        const aggregationResult = await Orcamento.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(pedidoId), contaId: new mongoose.Types.ObjectId(contaId) } },
            {
                $project: {
                    custoTotalMateriais: {
                        $add: [
                            {
                                $sum: {
                                    $map: {
                                        input: { $ifNull: ['$materiaisUsados', []] },
                                        as: 'item',
                                        in: { $multiply: ['$$item.custoNoMomento', '$$item.quantidade'] }
                                    }
                                }
                            },
                            {
                                $sum: {
                                    $map: {
                                        input: { $ifNull: ['$custosMateriais', []] },
                                        as: 'custo',
                                        in: { $toDouble: '$$custo.valor' }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        ]);

        if (!aggregationResult || aggregationResult.length === 0) {
            return res.status(404).json({ message: "Pedido não encontrado." });
        }

        const orcamento = aggregationResult[0];
        const custoTotalMateriais = orcamento.custoTotalMateriais || 0;

        // 2. Calcula os outros custos
        const custoMaoDeObra = Number(horasEstimadas || 0) * Number(custoHora || 0);
        const custoTotalTerceiros = Number(custosTerceiros || 0);

        // 3. Soma todos os custos
        const custoTotal = custoTotalMateriais + custoMaoDeObra + custoTotalTerceiros;

        // 4. LÓGICA DE CÁLCULO CORRIGIDA (LUCRO SOBRE O CUSTO)
        const margemDecimal = Number(margemLucro || 0) / 100;

        // A fórmula agora é Custo Total + (Custo Total * Margem)
        const precoSugerido = custoTotal * (1 + margemDecimal);
        // --- FIM DA CORREÇÃO ---

        let sugestaoCustoTerceiros = 0;
        if (custoTotalTerceiros === 0 && (custoTotalMateriais > 0 || custoMaoDeObra > 0)) {
            sugestaoCustoTerceiros = (custoTotalMateriais + custoMaoDeObra) * 0.20; // Sugere 20%
        }

        // (Opcional) Guarda os dados do cálculo para referência
        await Orcamento.findByIdAndUpdate(pedidoId, {
            horasEstimadas: Number(horasEstimadas || 0),
            custoHora: Number(custoHora || 0),
            margemLucro: Number(margemLucro || 0)
        });

        res.status(200).json({
            precoSugerido: precoSugerido.toFixed(2),
            sugestaoCustoTerceiros: sugestaoCustoTerceiros.toFixed(2)
        });

    } catch (error) {
        console.error("Erro ao calcular preço sugerido:", error);
        res.status(500).json({ message: 'Erro ao processar a sugestão de preço.' });
    }
};

// Cria um novo orçamento, com lógica para criar ou encontrar o cliente
const createOrcamento = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { contaId } = req.user; // Captura o ID da conta
        const body = req.body;

        const clienteData = body.clienteData || body;
        const orcamentoData = body.orcamentoData || body;

        if (!clienteData.telefone && !clienteData._id) {
            return res.status(400).json({ message: 'O telefone (para novos clientes) ou o ID do cliente (para existentes) é obrigatório.' });
        }

        let cliente;
        if (clienteData._id) {
            cliente = await Cliente.findOne({ _id: clienteData._id, contaId });
            if (!cliente) {
                return res.status(404).json({ message: 'Cliente existente não encontrado nesta conta.' });
            }
            
            // If new address data is provided, update the client
            if (clienteData.endereco) {
                cliente.endereco = clienteData.endereco;
                await cliente.save();
            }
        } else {
            const dadosSegurosCliente = {
                nome: clienteData.nome,
                endereco: clienteData.endereco,
                contaId: contaId
            };

            // Only set the email if it's a non-empty string
            if (clienteData.email && clienteData.email.trim() !== '') {
                dadosSegurosCliente.email = clienteData.email;
            }
            Object.keys(dadosSegurosCliente).forEach(key => dadosSegurosCliente[key] === undefined && delete dadosSegurosCliente[key]);

            cliente = await Cliente.findOneAndUpdate(
                { telefone: clienteData.telefone, contaId },
                { $set: dadosSegurosCliente },
                { upsert: true, new: true, runValidators: true }
            );
        }

        const dadosSegurosOrcamento = {
            descricao: orcamentoData.descricao,
            categoria: orcamentoData.categoria,
            valorProposto: orcamentoData.valorProposto,
            status: orcamentoData.status,
            dataAgendamento: orcamentoData.dataAgendamento,
            address: orcamentoData.address,
            cliente: cliente._id,
            contaId: contaId,
            historico: [{ evento: 'Pedido criado via sistema.' }]
        };
        Object.keys(dadosSegurosOrcamento).forEach(key => dadosSegurosOrcamento[key] === undefined && delete dadosSegurosOrcamento[key]);

        const novoOrcamento = new Orcamento(dadosSegurosOrcamento);
        const orcamentoSalvo = await novoOrcamento.save();

        const conta = await Conta.findById(contaId);
        if (conta && conta.telefone) {
             const notificationToPrestador = `🔔 *Novo Pedido Criado no Sistema!*\n\n` +
                                          `*Cliente:* ${cliente.nome}\n` +
                                          `*Descrição:* ${(orcamentoSalvo.descricao || '').slice(0, 80)}...\n\n` +
                                          `Para ver todos os detalhes, acesse o sistema.`;
            await whatsappService.sendWhatsAppMessage(conta.telefone, notificationToPrestador);
        }

        res.status(201).json(orcamentoSalvo);
    } catch (error) {
        console.error("Erro detalhado ao criar orçamento:", error);
        res.status(500).json({ 
            error: 'Ocorreu um erro ao salvar o orçamento.',
            message: error.message
        });
    }
};

// Atualiza um orçamento por ID
const updateOrcamento = async (req, res) => {
    try {
        const { contaId } = req.user;
        const orcamentoAtualizado = await Orcamento.findOneAndUpdate({ _id: req.params.id, contaId }, req.body, { new: true });
        if (!orcamentoAtualizado) {
            return res.status(404).json({ error: 'Orçamento não encontrado ou não pertence a esta conta.' });
        }
        res.status(200).json(orcamentoAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar orçamento.' });
    }
};

// Deleta um orçamento por ID
const deleteOrcamento = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { contaId } = req.user;
        const orcamentoId = req.params.id;

        // 1. Encontra o orçamento ANTES de deletar para ter acesso aos dados
        const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).session(session);

        if (!orcamento) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ error: 'Orçamento não encontrado ou não pertence a esta conta.' });
        }

        // 2. Devolve os materiais ao estoque se houver
        if (orcamento.materiaisUsados && orcamento.materiaisUsados.length > 0) {
            for (const material of orcamento.materiaisUsados) {
                await Produto.updateOne(
                    { _id: material.produto, contaId },
                    { $inc: { quantidadeEmEstoque: material.quantidade } },
                    { session }
                );
                // Cria um movimento de estorno para registrar a devolução
                const movimentoEstorno = new MovimentoEstoque({
                    contaId,
                    produto: material.produto,
                    tipo: 'Entrada',
                    quantidade: material.quantidade,
                    motivo: `Devolução por exclusão do Pedido #${orcamento.shortId}`,
                    orcamentoAssociado: orcamentoId
                });
                await movimentoEstorno.save({ session });
            }
        }

        // 3. Deleta as transações financeiras e despesas associadas ao orçamento
        await Transacao.deleteMany({ orcamentoAssociado: orcamentoId, contaId }, { session });
        await Despesa.deleteMany({ orcamentoAssociado: orcamentoId, contaId }, { session });

        // 4. Finalmente, deleta o próprio orçamento
        await Orcamento.deleteOne({ _id: orcamentoId, contaId }, { session });

        // Se tudo correu bem, comita a transação
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Orçamento e todos os dados associados (transações, despesas, estoque) foram deletados com sucesso.' });
    } catch (error) {
        // Se algo der errado, aborta a transação
        await session.abortTransaction();
        session.endSession();
        console.error("Erro ao deletar orçamento e dados associados:", error);
        res.status(500).json({ error: 'Erro ao deletar orçamento.' });
    }
};

// Função para buscar os últimos pedidos para o dashboard
const getRecentOrcamentos = async (req, res) => {
    try {
        const { contaId } = req.user;
        const orcamentos = await Orcamento.find({ contaId })
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
        const { contaId } = req.user;

        // Chama o serviço para executar a lógica de negócio
        const orcamentoAtualizado = await orcamentoService.atualizarStatus(contaId, orcamentoId, status);

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
        const { contaId } = req.user;

        // O controller chama o serviço, que contém toda a lógica.
        const orcamentoAtualizado = await orcamentoService.submeterOrcamento(contaId, orcamentoId, valorProposto);

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
        const { contaId } = req.user;

        if (!dataAgendamento) {
            return res.status(400).json({ error: 'A data de agendamento é obrigatória.' });
        }
        
        // O controller agora apenas chama o serviço, passando os dados necessários.
        // Toda a lógica complexa está no orcamento.service.js
        const orcamentoAtualizado = await orcamentoService.agendarServico(contaId, orcamentoId, dataAgendamento);

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
        const { contaId } = req.user;
        const { notasInternas } = req.body;
        const orcamento = await Orcamento.findOneAndUpdate(
            { _id: req.params.id, contaId },
            { notasInternas: notasInternas },
            { new: true }
        );

        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado ou não pertence a esta conta.' });
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
        const { contaId } = req.user;
        const allowedStatus = ['Pendente', 'Pago Parcial', 'Pago'];

        if (!statusPagamento || !allowedStatus.includes(statusPagamento)) {
            return res.status(400).json({ error: 'Status de pagamento inválido.' });
        }

        const orcamento = await Orcamento.findOne({ _id: req.params.id, contaId });
        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado ou não pertence a esta conta.' });
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
        const { contaId } = req.user;
        const orcamentosAgendados = await Orcamento.find({
            contaId: contaId,
            status: 'Agendado',
            dataAgendamento: { $exists: true, $ne: null }
        })
        .populate('cliente', 'nome telefone')
        .select('dataAgendamento descricao cliente');

        // ✅ FILTRO DE SEGURANÇA ADICIONADO AQUI
        // Antes de tentar formatar os dados, nós garantimos que não há nenhum pedido
        // com cliente ou data faltando, prevenindo o erro.
        const eventos = orcamentosAgendados
            .filter(orcamento => orcamento && orcamento.cliente && orcamento.dataAgendamento)
            .map(orcamento => {
                const tituloEvento = `Serviço para: ${orcamento.cliente.nome || 'Cliente Removido'}`;

                return {
                    id: orcamento._id,
                    title: tituloEvento,
                    start: orcamento.dataAgendamento,
                };
            });

        res.status(200).json(eventos);

    } catch (error) {
        console.error("ERRO em getAgendamentosParaCalendario:", error);
        res.status(500).json({ message: 'Erro interno ao buscar agendamentos.' });
    }
};
const adicionarMaterialAoPedido = async (req, res) => {
    try {
        const { orcamentoId } = req.params;
        const { produtoId, quantidade } = req.body;
        const { contaId } = req.user;

        // O controller apenas delega a tarefa para o serviço
        const orcamentoAtualizado = await orcamentoService.adicionarMaterial(contaId, orcamentoId, produtoId, quantidade);

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
        const { contaId } = req.user;
        const { anotacoesTecnicas, lembreteNotaFiscal } = req.body;
        const orcamento = await Orcamento.findOneAndUpdate(
            { _id: req.params.id, contaId },
            { $set: { anotacoesTecnicas, lembreteNotaFiscal } },
            { new: true }
        );
        if (!orcamento) return res.status(404).json({ message: 'Orçamento não encontrado ou não pertence a esta conta.' });
        res.status(200).json(orcamento);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar detalhes operacionais.', error });
    }
};
const addCustoMaterial = async (req, res) => {
    try {
        const { descricao, valor } = req.body;
        const { id } = req.params; // ID do orçamento
        const { contaId } = req.user;

        // 1. Adiciona o custo ao array de custos do orçamento
        const orcamentoAtualizado = await Orcamento.findOneAndUpdate(
            { _id: id, contaId },
            { $push: { custosMateriais: { descricao, valor } } },
            { new: true }
        );

        if (!orcamentoAtualizado) {
            return res.status(404).json({ message: 'Orçamento não encontrado ou não pertence a esta conta.' });
        }

        // =======================================================
        // ==> LÓGICA NOVA PARA CRIAR A DESPESA AUTOMATICAMENTE <==
        // =======================================================
        const novaDespesa = new Despesa({
            contaId: contaId, // MUDANÇA
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

        const { contaId } = req.user;
        const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId });
        if (!orcamento) {
            return res.status(404).json({ message: 'Orçamento não encontrado ou não pertence a esta conta.' });
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
        const { contaId } = req.user;
        const orcamento = await Orcamento.findOne({ _id: req.params.id, contaId }).populate('cliente', 'nome telefone');
        if (!orcamento) {
            return res.status(404).send('Orçamento não encontrado ou não pertence a esta conta.');
        }

        const conta = await Conta.findById(contaId);
        if (!conta) {
            return res.status(404).send('Conta do prestador não encontrada.');
        }

        // --- INÍCIO DA NOVA LÓGICA DA LOGO ---

        let logoHtml = ''; // Começa como uma string vazia

        // Verifica se a configuração e a URL da logo existem
        if (conta && conta.logoUrl) {
            try {
                // 1. Extrai apenas o nome do arquivo da URL completa
                const fileName = path.basename(conta.logoUrl);

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
            config: conta.toObject(),
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
        const { contaId } = req.user;
        const orcamento = await Orcamento.findOne({ _id: req.params.id, contaId }).populate('cliente', 'nome telefone');
        if (!orcamento) {
            return res.status(404).send('Orçamento não encontrado ou não pertence a esta conta.');
        }

        const conta = await Conta.findById(contaId);
        if (!conta) {
            return res.status(404).send('Conta do prestador não encontrada.');
        }

        // --- LÓGICA DA LOGO (IDÊNTICA À DA FATURA) ---
        let logoHtml = '';
        if (conta && conta.logoUrl) {
            try {
                const fileName = path.basename(conta.logoUrl);
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
            config: conta.toObject(),
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
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { valor, metodo, observacao, data } = req.body;
        const orcamentoId = req.params.id;
        const { contaId } = req.user;

        // Validação do valor
        if (!valor || valor <= 0) {
            throw new Error('O valor do pagamento deve ser maior que zero.');
        }

        // Validação case-insensitive do método de pagamento
        const metodosPermitidos = ['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência'];
        let metodoCorreto = metodo;
        if (metodo) {
            const metodoEncontrado = metodosPermitidos.find(p => p.toLowerCase() === metodo.toLowerCase());
            if (!metodoEncontrado) {
                throw new Error(`Método de pagamento inválido: '${metodo}'.`);
            }
            metodoCorreto = metodoEncontrado;
        }

        const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).session(session);
        if (!orcamento) {
            throw new Error('Orçamento não encontrado ou não pertence a esta conta.');
        }

        // Adiciona o pagamento ao orçamento
        orcamento.pagamentos.push({ valor, metodo: metodoCorreto, observacao, data: data || new Date() });
        await orcamento.save({ session });

        // Cria a transação financeira correspondente
        const novaTransacao = new Transacao({
            contaId,
            tipo: 'Receita',
            descricao: `Recebimento referente ao pedido #${orcamento.shortId}`,
            valor,
            categoria: 'Venda de Serviço',
            data: data || new Date(),
            orcamentoAssociado: orcamentoId,
            metodoPagamento: metodoCorreto,
        });
        await novaTransacao.save({ session });
        
        await session.commitTransaction();
        session.endSession();

        res.status(200).json(orcamento);

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Erro ao adicionar pagamento:", error);
        res.status(500).json({ message: error.message || 'Erro interno ao adicionar pagamento.' });
    }
};

// =======================================================
// 👉 NOVA FUNÇÃO PARA REMOVER PAGAMENTO
// =======================================================
const removerPagamento = async (req, res) => {
    try {
        const { id: orcamentoId, pagamentoId } = req.params;
        const { contaId } = req.user;

        const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId });
        if (!orcamento) {
            return res.status(404).json({ message: 'Orçamento não encontrado ou não pertence a esta conta.' });
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

const removeCustoMaterial = async (req, res) => {
    try {
        const { orcamentoId, custoId } = req.params;
        const { contaId } = req.user;

        const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId });
        if (!orcamento) {
            return res.status(404).json({ message: 'Orçamento não encontrado ou não pertence a esta conta.' });
        }

        // Acha o custo específico que será removido para pegar seus detalhes
        const custo = orcamento.custosMateriais.id(custoId);
        if (!custo) {
            return res.status(404).json({ message: 'Custo específico não encontrado no pedido.' });
        }

        // Deleta a Despesa correspondente. Esta é a lógica que faltava.
        // É uma abordagem "best-effort" baseada nos dados que temos.
        const despesaDescricao = `Material para pedido #${orcamento.shortId}: ${custo.descricao}`;
        await Despesa.findOneAndDelete({
            orcamentoAssociado: orcamentoId,
            descricao: despesaDescricao,
            valor: custo.valor
        });

        // Remove o custo do array no orçamento
        orcamento.custosMateriais.pull({ _id: custoId });
        await orcamento.save();

        res.status(200).json(orcamento);

    } catch (error) {
        console.error("Erro ao remover custo de material:", error);
        res.status(500).json({ message: 'Erro interno ao remover custo de material.' });
    }
};

const getAgendadosParaCalendario = async (req, res) => {
    try {
        const { contaId } = req.user;
        // 1. Busca no banco todos os orçamentos com status 'Agendado' e que tenham uma data
        const orcamentosAgendados = await Orcamento.find({
            contaId: contaId,
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
        const { contaId } = req.user;
        const pedido = await Orcamento.findOne({ _id: req.params.id, contaId });
        if (!pedido) {
            return res.status(404).json({ message: "Pedido não encontrado ou não pertence a esta conta." });
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

        const orcamento = await Orcamento.findOneAndUpdate(
            { _id: id, contaId: req.user.contaId },
            { notaFiscalUrl: imageUrl },
            { new: true, runValidators: true }
        );

        if (!orcamento) {
            return res.status(404).json({ message: 'Orçamento não encontrado ou não pertence a esta conta.' });
        }

        res.status(200).json({ message: 'Nota fiscal anexada com sucesso!', orcamento });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao anexar nota fiscal.', error: error.message });
    }
};
const getPedidosPorCliente = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { clienteId } = req.params;

        // 1. Verifica se o cliente pertence à conta do usuário
        const cliente = await Cliente.findOne({ _id: clienteId, contaId });
        if (!cliente) {
            return res.status(404).json({ message: "Cliente não encontrado ou não pertence a esta conta." });
        }

        // 2. Busca os pedidos do cliente, já sabendo que o cliente está na conta correta
        const pedidosDoCliente = await Orcamento.find({ cliente: clienteId, contaId }).sort({ data: -1 });

        res.status(200).json(pedidosDoCliente);

    } catch (error) {
        console.error("Erro ao buscar pedidos por cliente:", error);
        res.status(500).json({ message: "Erro ao buscar os pedidos do cliente." });
    }
};
const removerMaterialDoPedido = async (req, res) => {
    try {
        const { orcamentoId, materialUsadoId } = req.params;
        const { contaId } = req.user;

        // A lógica de negócio foi movida para o serviço
        const orcamentoAtualizado = await orcamentoService.removerMaterial(contaId, orcamentoId, materialUsadoId);

        res.status(200).json({ message: "Material removido com sucesso!", orcamento: orcamentoAtualizado });

    } catch (error) {
        console.error("ERRO na rota removerMaterialDoPedido:", error);
        // Retorna a mensagem de erro específica do serviço para facilitar a depuração
        res.status(error.statusCode || 500).json({ message: error.message || 'Erro interno ao remover material do pedido.' });
    }
};
// Exporta TODAS as funções que as rotas utilizam.
const gerarLinkPagamento = async (req, res) => {
    try {
        const orcamentoId = req.params.id;
        const { contaId } = req.user;

        const orcamento = await orcamentoService.gerarLinkPagamentoMercadoPago(contaId, orcamentoId);

        res.status(200).json({ message: 'Link de pagamento gerado com sucesso!', orcamento });
    } catch (error) {
        // Trata erros específicos que o serviço pode lançar
        if (error.name === 'NotFoundError' || error.name === 'ForbiddenError' || error.name === 'BusinessLogicError') {
            return res.status(error.statusCode || 400).json({ message: error.message });
        }
        console.error('Erro ao gerar link de pagamento:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
};

const enviarCobranca = async (req, res) => {
    try {
        const { id } = req.params;
        // Agora esperamos também o templateId no corpo da requisição
        const { desconto = 0, templateId } = req.body; 
        const { contaId } = req.user;

        // Passamos o templateId para a função de serviço
        const result = await orcamentoService.enviarCobrancaComDesconto(contaId, id, desconto, templateId);

        res.status(200).json(result);
    } catch (error) {
        // O serviço já lança erros com status codes apropriados
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

const getDistinctCategorias = async (req, res) => {
    try {
        const { contaId } = req.user;
        const categorias = await Orcamento.distinct('categoria', { contaId, categoria: { $ne: null, $ne: "" } });
        res.status(200).json(categorias);
    } catch (error) {
        console.error("Erro ao buscar categorias de orçamentos:", error);
        res.status(500).json({ error: 'Erro ao buscar categorias.' });
    }
};

const debugCosts = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { pedidoId } = req.params;
        const { stage } = req.query;

        let pipeline = [
            { $match: { _id: new mongoose.Types.ObjectId(pedidoId), contaId: new mongoose.Types.ObjectId(contaId) } }
        ];

        // Stage 1: Just the raw document
        if (stage === '1') {
            const result = await Orcamento.aggregate(pipeline);
            return res.json(result);
        }

        // Stage 2: The projection with the cost calculation
        const projectStage = {
            $project: {
                materiaisUsados: 1,
                custosMateriais: 1,
                custoTotalMateriais: {
                    $add: [
                        { $sum: { $map: { input: { $ifNull: ['$materiaisUsados', []] }, as: 'item', in: { $multiply: ['$$item.custoNoMomento', '$$item.quantidade'] } } } },
                        { $sum: { $map: { input: { $ifNull: ['$custosMateriais', []] }, as: 'custo', in: { $toDouble: '$$custo.valor' } } } }
                    ]
                }
            }
        };
        pipeline.push(projectStage);
        const result = await Orcamento.aggregate(pipeline);
        return res.json(result);

    } catch (error) {
        console.error("Erro na rota de depuração de custos:", error);
        res.status(500).json({ message: 'Erro na depuração.', error: error.message, stack: error.stack });
    }
};

module.exports = {
    debugCosts,
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
    getPedidosPorCliente,
    calcularPrecoSugerido,
    removeCustoMaterial,
    removerMaterialDoPedido,
    gerarLinkPagamento,
    enviarCobranca,
    getDistinctCategorias,
};
