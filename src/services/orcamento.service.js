// Em: src/services/orcamento.service.js
const Orcamento = require('../models/orcamento.model');
const whatsappService = require('./whatsapp.service'); // O serviço de orçamento vai usar o serviço de WhatsApp
const Produto = require('../models/produto.model');
const MovimentoEstoque = require('../models/movimentoEstoque.model'); 
/**
 * Contém a lógica de negócio para agendar um serviço.
 * @param {string} orcamentoId - O ID do orçamento a ser agendado.
 * @param {string|Date} dataAgendamento - A data para a qual o serviço será agendado.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const agendarServico = async (orcamentoId, dataAgendamento) => {
    const orcamento = await Orcamento.findById(orcamentoId).populate('cliente', 'nome telefone');

    if (!orcamento) {
        // Lança um erro que o controller irá apanhar e tratar.
        // Isto é melhor do que o serviço ter de lidar com res.status().
        throw new Error('Orçamento não encontrado.');
    }

    const isReagendamento = orcamento.status === 'Agendado';
    
    // Atualiza os dados do orçamento
    orcamento.status = 'Agendado';
    orcamento.dataAgendamento = new Date(dataAgendamento);
    orcamento.historico.push({ evento: `Serviço agendado para ${new Date(dataAgendamento).toLocaleString('pt-BR')}.` });
    
    // Salva o orçamento atualizado no banco de dados
    const orcamentoSalvo = await orcamento.save();

    // Envia a notificação via WhatsApp (a lógica de notificação pertence ao serviço)
    if (orcamento.cliente && orcamento.cliente.telefone) {
        const tipoAcao = isReagendamento ? "REAGENDADO" : "AGENDADO";
        const dataFormatada = new Date(dataAgendamento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        const notificationMessage = `Serviço *${tipoAcao}*!\n\nOlá, ${orcamento.cliente.nome}. O seu serviço para o pedido #${orcamento.shortId} foi ${isReagendamento ? 'reagendado para' : 'agendado para'}:\n\n*Data e Hora:* ${dataFormatada}\n\nAté breve!`;
        
        await whatsappService.sendWhatsAppMessage(orcamento.cliente.telefone, notificationMessage);
    }

    return orcamentoSalvo; // Retorna o orçamento para o controller
};
 /**
 * Contém a lógica de negócio para atualizar o status de um orçamento.
 * @param {string} orcamentoId - O ID do orçamento a ser atualizado.
 * @param {string} novoStatus - O novo status a ser aplicado.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const atualizarStatus = async (orcamentoId, novoStatus) => {
    // 1. Validação da regra de negócio (quais status são permitidos)
    const allowedStatus = ['Pendente', 'Aceito', 'Agendado', 'Finalizado', 'Rejeitado'];
    if (!allowedStatus.includes(novoStatus)) {
        throw new Error('Status inválido fornecido.');
    }

    // Usamos .populate() para ter os dados do cliente para a notificação
    const orcamento = await Orcamento.findById(orcamentoId).populate('cliente', 'nome telefone');
    if (!orcamento) {
        throw new Error('Orçamento não encontrado.');
    }
    
    // Guarda o status antigo para comparações
    const statusAntigo = orcamento.status;
    
    // 2. Atualiza os dados
    orcamento.status = novoStatus;
    orcamento.historico.push({ evento: `Status alterado para "${novoStatus}".` });

    // 3. Lógica de negócio específica para quando um serviço é finalizado
    if (novoStatus === 'Finalizado' && statusAntigo !== 'Finalizado') {
        orcamento.dataFinalizacao = new Date();
        // A lógica de enviar a pesquisa agora fica a cargo de um job,
        // que irá ler esta data. Manter esta parte aqui está perfeito.
    }
    
    // Salva e retorna o orçamento atualizado
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
    // 1. A validação de negócio (se o valor é positivo) pertence ao serviço.
    if (!valorProposto || isNaN(valorProposto) || valorProposto <= 0) {
        throw new Error('Valor do orçamento é obrigatório e deve ser um número positivo.');
    }

    // 2. Encontra e atualiza o documento
    const orcamento = await Orcamento.findById(orcamentoId).populate('cliente', 'nome telefone');
    if (!orcamento) {
        throw new Error('Orçamento não encontrado.');
    }

    orcamento.valorProposto = parseFloat(valorProposto);
    orcamento.historico.push({ evento: `Orçamento de R$ ${orcamento.valorProposto.toFixed(2)} proposto ao cliente.` });
    
    const orcamentoSalvo = await orcamento.save();

    // 3. Lógica de notificação
    if (orcamento.cliente && orcamento.cliente.telefone) {
        const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valorProposto);
        const notificationMessage = `Boas notícias, ${orcamento.cliente.nome}! O seu orçamento para o pedido #${orcamento.shortId} está pronto.\n\n*Valor:* ${valorFormatado}\n\nPara aprovar, entre em contato connosco.`;
        
        await whatsappService.sendWhatsAppMessage(orcamento.cliente.telefone, notificationMessage);
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

    // 1. Validação dos dados de entrada
    if (!produtoId || !quantidadeNum || quantidadeNum <= 0) {
        throw new Error("ID do produto e quantidade válida são obrigatórios.");
    }

    // 2. Encontra o produto e o orçamento em paralelo para maior eficiência
    const [produto, orcamento] = await Promise.all([
        Produto.findById(produtoId),
        Orcamento.findById(orcamentoId)
    ]);

    if (!produto || !orcamento) {
        throw new Error("Pedido ou produto não encontrado.");
    }

    // 3. Validação da regra de negócio: verificar se há stock suficiente
    if (produto.quantidadeEmEstoque < quantidadeNum) {
        throw new Error(`Stock insuficiente para "${produto.nome}". Apenas ${produto.quantidadeEmEstoque} em stock.`);
    }

    // 4. Atualiza a quantidade de stock do produto
    produto.quantidadeEmEstoque -= quantidadeNum;
    
    // 5. Adiciona o material à lista do pedido
    orcamento.materiaisUsados.push({
        produto: produtoId,
        quantidade: quantidadeNum,
        custoNoMomento: produto.custoUnitario // Guarda o "preço de custo" daquele momento
    });

    // 6. Cria um registo no histórico de movimentações
    const movimento = new MovimentoEstoque({
        produto: produtoId,
        tipo: 'Saída',
        quantidade: quantidadeNum,
        motivo: `Uso no Pedido #${orcamento.shortId}`,
        orcamentoAssociado: orcamentoId
    });

    // 7. Salva todas as alterações no banco de dados de forma atómica
    await Promise.all([
        produto.save(),
        orcamento.save(),
        movimento.save()
    ]);

    return orcamento; // Retorna o orçamento atualizado
};


// Exportamos a função para que os controllers possam usá-la
module.exports = {
    agendarServico,
    atualizarStatus,
    submeterOrcamento,
    getClienteInfo, 
    adicionarMaterial,
};