// Em: src/services/orcamento.service.js
const Orcamento = require('../models/orcamento.model');
const whatsappService = require('./whatsapp.service');
const Produto = require('../models/produto.model');
const MovimentoEstoque = require('../models/movimentoEstoque.model'); 
const googleCalendarService = require('./googleCalendar.service.js'); // O import já estava correto

/**
 * Contém a lógica de negócio para agendar um serviço.
 * @param {string} orcamentoId - O ID do orçamento a ser agendado.
 * @param {string|Date} dataAgendamento - A data para a qual o serviço será agendado.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const agendarServico = async (orcamentoId, dataAgendamento) => {
    const orcamento = await Orcamento.findById(orcamentoId).populate('cliente', 'nome telefone');

    if (!orcamento) {
        throw new Error('Orçamento não encontrado.');
    }

    // ... (lógica para atualizar o status e histórico do orçamento)
    orcamento.status = 'Agendado';
    orcamento.dataAgendamento = new Date(dataAgendamento);
    orcamento.historico.push({ evento: `Serviço agendado para ${new Date(dataAgendamento).toLocaleString('pt-BR')}.` });
    
    const orcamentoSalvo = await orcamento.save();

    // --- LÓGICA DE NOTIFICAÇÃO ATUALIZADA ---
    if (orcamento.cliente && orcamento.cliente.telefone) {
        // 1. Renderiza o template "Serviço Agendado"
        const mensagemRenderizada = await whatsappService.renderTemplate('Serviço Agendado', orcamentoSalvo);
        
        // 2. Se a mensagem foi renderizada com sucesso, envia-a
        if (mensagemRenderizada) {
            await whatsappService.sendWhatsAppMessage(orcamento.cliente.telefone, mensagemRenderizada);
        }
    }

    // --- 3. CHAMA A FUNÇÃO PARA CRIAR O EVENTO NO GOOGLE CALENDAR ---
    // Esta chamada acontece após o agendamento ser salvo e a notificação enviada.
    googleCalendarService.createEvent(orcamentoSalvo);
    // -----------------------------------------------------------

    return orcamentoSalvo;
};

/**
 * Contém a lógica de negócio para atualizar o status de um orçamento.
 * @param {string} orcamentoId - O ID do orçamento a ser atualizado.
 * @param {string} novoStatus - O novo status a ser aplicado.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const atualizarStatus = async (orcamentoId, novoStatus) => {
    const allowedStatus = ['Pendente', 'Aceito', 'Agendado', 'Finalizado', 'Rejeitado'];
    if (!allowedStatus.includes(novoStatus)) {
        throw new Error('Status inválido fornecido.');
    }

    const orcamento = await Orcamento.findById(orcamentoId).populate('cliente', 'nome telefone');
    if (!orcamento) {
        throw new Error('Orçamento não encontrado.');
    }
    
    const statusAntigo = orcamento.status;
    
    orcamento.status = novoStatus;
    orcamento.historico.push({ evento: `Status alterado para "${novoStatus}".` });

    if (novoStatus === 'Finalizado' && statusAntigo !== 'Finalizado') {
        orcamento.dataFinalizacao = new Date();
    }
    
    const orcamentoAtualizado = await orcamento.save();
    return orcamentoAtualizado;
};

/**
 * Contém a lógica de negócio para submeter um valor de orçamento a um cliente.
 * @param {string} orcamentoId - O ID do orçamento.
 * @param {number} valorProposto - O valor numérico do orçamento.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const submeterOrcamento = async (orcamentoId, valorProposto) => {
    if (!valorProposto || isNaN(valorProposto) || valorProposto <= 0) {
        throw new Error('Valor do orçamento é obrigatório e deve ser um número positivo.');
    }

    const orcamento = await Orcamento.findById(orcamentoId).populate('cliente', 'nome telefone');
    if (!orcamento) {
        throw new Error('Orçamento não encontrado.');
    }

    orcamento.valorProposto = parseFloat(valorProposto);
    orcamento.historico.push({ evento: `Orçamento de R$ ${orcamento.valorProposto.toFixed(2)} proposto ao cliente.` });
    
    const orcamentoSalvo = await orcamento.save();

    if (orcamento.cliente && orcamento.cliente.telefone) {
        const mensagemRenderizada = await whatsappService.renderTemplate('Novo Orçamento', orcamentoSalvo);
        if (mensagemRenderizada) {
            await whatsappService.sendWhatsAppMessage(orcamento.cliente.telefone, mensagemRenderizada);
        }
    }

    return orcamentoSalvo;
};

/**
 * Obtém as informações do cliente associado a um orçamento.
 * @param {string} orcamentoId - O ID do orçamento.
 * @returns {Promise<Object>} O objeto do cliente.
 */
const getClienteInfo = async (orcamentoId) => {
    const orcamento = await Orcamento.findById(orcamentoId).populate('cliente', 'nome');
    if (!orcamento || !orcamento.cliente) {
        throw new Error('Cliente não encontrado para este orçamento.');
    }
    return orcamento.cliente;
};

/**
 * Contém a lógica de negócio para adicionar um material de estoque a um pedido.
 * @param {string} orcamentoId - O ID do orçamento.
 * @param {string} produtoId - O ID do produto a ser adicionado.
 * @param {number} quantidade - A quantidade do produto a ser usada.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const adicionarMaterial = async (orcamentoId, produtoId, quantidade) => {
    const quantidadeNum = Number(quantidade);

    if (!produtoId || !quantidadeNum || quantidadeNum <= 0) {
        throw new Error("ID do produto e quantidade válida são obrigatórios.");
    }

    const [produto, orcamento] = await Promise.all([
        Produto.findById(produtoId),
        Orcamento.findById(orcamentoId)
    ]);

    if (!produto || !orcamento) {
        throw new Error("Pedido ou produto não encontrado.");
    }

    if (produto.quantidadeEmEstoque < quantidadeNum) {
        throw new Error(`Stock insuficiente para "${produto.nome}". Apenas ${produto.quantidadeEmEstoque} em stock.`);
    }

    produto.quantidadeEmEstoque -= quantidadeNum;
    
    orcamento.materiaisUsados.push({
        produto: produtoId,
        quantidade: quantidadeNum,
        custoNoMomento: produto.custoUnitario
    });

    const movimento = new MovimentoEstoque({
        produto: produtoId,
        tipo: 'Saída',
        quantidade: quantidadeNum,
        motivo: `Uso no Pedido #${orcamento.shortId}`,
        orcamentoAssociado: orcamentoId
    });

    await Promise.all([
        produto.save(),
        orcamento.save(),
        movimento.save()
    ]);

    return orcamento;
};

// Exportamos a função para que os controllers possam usá-la
module.exports = {
    agendarServico,
    atualizarStatus,
    submeterOrcamento,
    getClienteInfo, 
    adicionarMaterial,
};
