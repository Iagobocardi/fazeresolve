// Arquivo: src/controllers/orcamentos.controller.js

const Orcamento = require('../models/orcamento.model');
const { validationResult, body } = require('express-validator');
const whatsappService = require('../services/whatsapp.service');

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
        // CORREÇÃO APLICADA AQUI
        const orcamentos = await Orcamento.find()
            .populate('cliente', 'nome telefone') // Agora busca o nome E o telefone
            .sort({ data: -1 });
        res.status(200).json(orcamentos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar orçamentos.' });
    }
};

// Obtém um orçamento por ID
const getOrcamentoById = async (req, res) => {
    try {
        const orcamento = await Orcamento.findById(req.params.id).populate('cliente', 'nome');
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
        const allowedStatus = ['Pendente', 'Aceito', 'Agendado', 'Finalizado', 'Rejeitado'];
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({ error: 'Status inválido fornecido.' });
        }

        // CORREÇÃO: Adicionado o .populate('cliente') para termos acesso ao telefone
        const orcamento = await Orcamento.findById(req.params.id).populate('cliente');
        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        
        const statusAntigo = orcamento.status;
        
        orcamento.status = status;
        orcamento.historico.push({ evento: `Status alterado para "${status}".` });

        if (status === 'Finalizado') {
            orcamento.dataFinalizacao = new Date();
            if (statusAntigo !== 'Finalizado' && !orcamento.pesquisaEnviada) {
                if (orcamento.cliente && orcamento.cliente.telefone) {
                    await whatsappService.sendSatisfactionSurvey(orcamento.cliente.telefone, orcamento._id);
                    orcamento.pesquisaEnviada = true;
                }
            }
        }
        
        const orcamentoAtualizado = await orcamento.save();
        res.status(200).json(orcamentoAtualizado);
    } catch (error) {
        console.error("ERRO em updateOrcamentoStatus:", error);
        res.status(500).json({ error: 'Erro ao atualizar status do orçamento.' });
    }
};
// Adicione esta nova função ao seu ficheiro:
// Em: src/controllers/orcamentos.controller.js

const submitOrcamento = async (req, res) => {
    try {
        const { valorProposto } = req.body;
        if (!valorProposto || isNaN(valorProposto) || valorProposto <= 0) {
            return res.status(400).json({ error: 'Valor do orçamento é obrigatório e deve ser um número positivo.' });
        }

        const orcamento = await Orcamento.findById(req.params.id).populate('cliente');
        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }

        orcamento.status = 'Aceito';
        orcamento.valorProposto = parseFloat(valorProposto);
        orcamento.historico.push({ evento: `Orçamento de R$ ${orcamento.valorProposto.toFixed(2)} enviado.` });
        
        await orcamento.save();

        if (orcamento.cliente && orcamento.cliente.telefone) {
            // --- CORREÇÃO APLICADA AQUI ---
            // Usamos o método nativo do JavaScript para formatar a moeda.
            const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valorProposto);
            const notificationMessage = `Boas notícias, ${orcamento.cliente.nome}! O seu orçamento para o pedido #${orcamento.shortId} está pronto.\n\n*Valor:* ${valorFormatado}\n\nPara aprovar, entre em contato connosco.`;
            
            await whatsappService.sendWhatsAppMessage(orcamento.cliente.telefone, notificationMessage);
        }

        res.status(200).json(orcamento);
    } catch (error) {
        // O erro que você viu aconteceu aqui dentro, então o log é importante.
        console.error("ERRO em submitOrcamento:", error);
        res.status(500).json({ error: 'Erro ao submeter o orçamento.' });
    }
};
const scheduleOrcamento = async (req, res) => {
    try {
        const { dataAgendamento } = req.body;
        if (!dataAgendamento) {
            return res.status(400).json({ error: 'A data de agendamento é obrigatória.' });
        }

        // CORREÇÃO: Garante que o cliente é populado para a notificação
        const orcamento = await Orcamento.findById(req.params.id).populate('cliente');
        if (!orcamento) {
            return res.status(404).json({ error: 'Orçamento não encontrado.' });
        }
        
        const isReagendamento = orcamento.status === 'Agendado';
        
        orcamento.status = 'Agendado';
        orcamento.dataAgendamento = dataAgendamento;
        orcamento.historico.push({ evento: `Serviço agendado para ${dataAgendamento}.` });
        
        const orcamentoAtualizado = await orcamento.save();

        // CORREÇÃO: Lógica de notificação agora dentro de um bloco seguro
        if (orcamento.cliente && orcamento.cliente.telefone) {
            const tipoAcao = isReagendamento ? "REAGENDADO" : "AGENDADO";
            // LINHAS NOVAS E CORRETAS
             const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valorProposto);
             const notificationMessage = `Boas notícias, ${orcamento.cliente.nome}! O seu orçamento para o pedido #${orcamento.shortId} está pronto.\n\n*Valor:* ${valorFormatado}\n\nPara aprovar, entre em contato connosco.`;
            await whatsappService.sendWhatsAppMessage(orcamento.cliente.telefone, notificationMessage);
        }

        res.status(200).json(orcamentoAtualizado);
    } catch (error) {
        console.error("ERRO em scheduleOrcamento:", error);
        res.status(500).json({ error: 'Erro ao agendar o serviço.' });
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
        const pedidosAgendados = await Orcamento.find({
            status: 'Agendado',
            dataAgendamento: { $exists: true, $ne: null }
        }).populate('cliente', 'nome');

        // Formata os dados para o formato que o FullCalendar espera
        const eventos = pedidosAgendados.map(pedido => {
            // Tenta extrair data e hora da string de agendamento
            const [data, hora] = pedido.dataAgendamento.split(' às ');
            const startDateTime = data && hora ? new Date(`${data}T${hora}`) : new Date(pedido.dataAgendamento);

            // Se a data for inválida, pula este evento para não quebrar o calendário
            if (isNaN(startDateTime.getTime())) {
                return null;
            }

            return {
                id: pedido._id,
                title: `#${pedido.shortId} - ${pedido.cliente.nome}`,
                start: startDateTime,
                allDay: !hora // Se não houver hora especificada, trata como evento de dia inteiro
            };
        }).filter(Boolean); // Remove quaisquer eventos nulos (com datas inválidas)

        res.status(200).json(eventos);

    } catch (error) {
        console.error("ERRO em getAgendamentosParaCalendario:", error);
        res.status(500).json({ message: 'Erro ao buscar agendamentos.' });
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
    getAgendamentosParaCalendario
};