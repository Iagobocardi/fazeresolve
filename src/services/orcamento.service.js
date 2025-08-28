// Em: src/services/orcamento.service.js
const Orcamento = require('../models/orcamento.model');
const whatsappService = require('./whatsapp.service');
const Produto = require('../models/produto.model');
const MovimentoEstoque = require('../models/movimentoEstoque.model'); 
const { MercadoPagoConfig, Preference } = require('mercadopago');
const Conta = require('../models/conta.model'); // MUDANÇA: Usa o novo modelo Conta
const Cliente = require('../models/cliente.model');
const googleCalendarService = require('./googleCalendar.service.js');

// Custom Error Classes for better error handling
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

class ForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ForbiddenError';
        this.statusCode = 403;
    }
}

class BusinessLogicError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BusinessLogicError';
        this.statusCode = 400;
    }
}


const gerarLinkPagamentoMercadoPago = async (contaId, orcamentoId) => {
    // 1. Fetch all necessary data in parallel
    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).populate('cliente');
    const conta = await Conta.findById(contaId);

    // 2. Perform validations
    if (!orcamento) {
        throw new NotFoundError('Orçamento não encontrado ou não pertence à sua conta.');
    }
    if (!conta) {
        throw new NotFoundError('Conta do prestador não encontrada.');
    }
    if (conta.metodoRecebimento !== 'MERCADOPAGO') {
        throw new BusinessLogicError('O seu método de recebimento não está configurado como Mercado Pago.');
    }
    if (orcamento.linkPagamento) {
        throw new BusinessLogicError('Este orçamento já possui um link de pagamento gerado.');
    }
    if (orcamento.valorProposto <= 0) {
        throw new BusinessLogicError('O orçamento precisa ter um valor proposto maior que zero.');
    }

    // 3. Initialize Mercado Pago client
    const client = new MercadoPagoConfig({ accessToken: conta.credenciaisMercadoPago.accessToken });
    const preference = new Preference(client);

    // 4. Create the preference payload
    const preferencePayload = {
        items: [
            {
                id: orcamento._id.toString(),
                title: `Serviço referente ao pedido #${orcamento.shortId}`,
                description: orcamento.descricao || 'Serviço profissional',
                quantity: 1,
                unit_price: orcamento.valorProposto,
                currency_id: 'BRL',
            },
        ],
        payer: {
            name: orcamento.cliente.nome,
            email: orcamento.cliente.email,
        },
        back_urls: {
            success: `${process.env.FRONTEND_URL}/payment-success`,
            failure: `${process.env.FRONTEND_URL}/payment-failure`,
            pending: `${process.env.FRONTEND_URL}/payment-pending`,
        },
        notification_url: `${process.env.API_URL}/api/mercado-pago/webhook`,
        // A taxa do marketplace viria de uma configuração global, não da conta do prestador.
        // marketplace_fee: (orcamento.valorProposto * config.taxaMarketplace) / 100,
        external_reference: orcamentoId,
    };

    // 5. Call Mercado Pago API
    const result = await preference.create({ body: preferencePayload });

    // 6. Save the link and return the updated document
    orcamento.linkPagamento = result.init_point;
    await orcamento.save();

    return orcamento;
};

/**
 * Analisa uma string de data personalizada como "DD/MM as HH horas" e a converte em um objeto Date.
 * @param {string} dateString - A string de data personalizada.
 * @returns {Date|null} Um objeto Date ou nulo se a análise falhar.
 */
const parseCustomDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') {
        return null;
    }
    
    const regex = /(\d{1,2})\/(\d{1,2}) as (\d{1,2}) horas/;
    const match = dateString.match(regex);

    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // Meses em JavaScript são de 0 a 11
        const hour = parseInt(match[3], 10);
        const year = new Date().getFullYear(); // Assume o ano corrente

        return new Date(year, month, day, hour);
    }
    
    const standardDate = new Date(dateString);
    if (!isNaN(standardDate.getTime())) {
        return standardDate;
    }

    return null;
};


/**
 * Contém a lógica de negócio para agendar um serviço.
 * @param {string} contaId - O ID da conta do prestador.
 * @param {string} orcamentoId - O ID do orçamento a ser agendado.
 * @param {string|Date} dataAgendamento - A data para a qual o serviço será agendado.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const agendarServico = async (contaId, orcamentoId, dataAgendamento) => {
    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).populate('cliente', 'nome telefone');

    if (!orcamento) {
        throw new NotFoundError('Orçamento não encontrado ou não pertence à sua conta.');
    }

    const parsedDate = parseCustomDate(dataAgendamento);

    if (!parsedDate) {
        throw new BusinessLogicError(`Formato de data de agendamento inválido: "${dataAgendamento}"`);
    }

    orcamento.status = 'Agendado';
    orcamento.dataAgendamento = parsedDate;
    orcamento.historico.push({ evento: `Serviço agendado para ${parsedDate.toLocaleString('pt-BR')}.` });
    
    const orcamentoSalvo = await orcamento.save();

    // --- LÓGICA DE NOTIFICAÇÃO ATUALIZADA ---
    if (orcamento.cliente && orcamento.cliente.telefone) {
        const mensagemRenderizada = await whatsappService.renderTemplate('Serviço Agendado', orcamentoSalvo);
        
        if (mensagemRenderizada) {
            await whatsappService.sendWhatsAppMessage(orcamento.cliente.telefone, mensagemRenderizada);
        }
    }

    // --- 3. CHAMA A FUNÇÃO PARA CRIAR O EVENTO NO GOOGLE CALENDAR ---
    // A integração com o Google Calendar precisará ser adaptada para usar os tokens da conta/usuário
    // googleCalendarService.createEvent(orcamentoSalvo);
    // -----------------------------------------------------------

    return orcamentoSalvo;
};

/**
 * Contém a lógica de negócio para atualizar o status de um orçamento.
 * @param {string} contaId - O ID da conta do prestador.
 * @param {string} orcamentoId - O ID do orçamento a ser atualizado.
 * @param {string} novoStatus - O novo status a ser aplicado.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const atualizarStatus = async (contaId, orcamentoId, novoStatus) => {
    const allowedStatus = ['Pendente', 'Aceito', 'Agendado', 'Finalizado', 'Rejeitado'];
    if (!allowedStatus.includes(novoStatus)) {
        throw new BusinessLogicError('Status inválido fornecido.');
    }

    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).populate('cliente', 'nome telefone');
    if (!orcamento) {
        throw new NotFoundError('Orçamento não encontrado ou não pertence à sua conta.');
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
 * @param {string} contaId - O ID da conta do prestador.
 * @param {string} orcamentoId - O ID do orçamento.
 * @param {number} valorProposto - O valor numérico do orçamento.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const submeterOrcamento = async (contaId, orcamentoId, valorProposto) => {
    if (!valorProposto || isNaN(valorProposto) || valorProposto <= 0) {
        throw new BusinessLogicError('Valor do orçamento é obrigatório e deve ser um número positivo.');
    }

    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).populate('cliente', 'nome telefone');
    if (!orcamento) {
        throw new NotFoundError('Orçamento não encontrado ou não pertence à sua conta.');
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
 * @param {string} contaId - O ID da conta do prestador.
 * @param {string} orcamentoId - O ID do orçamento.
 * @returns {Promise<Object>} O objeto do cliente.
 */
const getClienteInfo = async (contaId, orcamentoId) => {
    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).populate('cliente', 'nome');
    if (!orcamento || !orcamento.cliente) {
        throw new NotFoundError('Cliente não encontrado para este orçamento ou orçamento não pertence à sua conta.');
    }
    return orcamento.cliente;
};

/**
 * Contém a lógica de negócio para adicionar um material de estoque a um pedido.
 * @param {string} contaId - O ID da conta do prestador.
 * @param {string} orcamentoId - O ID do orçamento.
 * @param {string} produtoId - O ID do produto a ser adicionado.
 * @param {number} quantidade - A quantidade do produto a ser usada.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const adicionarMaterial = async (contaId, orcamentoId, produtoId, quantidade) => {
    const quantidadeNum = Number(quantidade);

    if (!produtoId || !quantidadeNum || quantidadeNum <= 0) {
        throw new BusinessLogicError("ID do produto e quantidade válida são obrigatórios.");
    }

    // Valida o produto e o orçamento no escopo da conta
    const [produto, orcamento] = await Promise.all([
        Produto.findOne({ _id: produtoId, contaId }), // Assumindo que Produto também terá contaId
        Orcamento.findOne({ _id: orcamentoId, contaId })
    ]);

    if (!produto || !orcamento) {
        throw new NotFoundError("Pedido ou produto não encontrado na sua conta.");
    }

    if (produto.quantidadeEmEstoque < quantidadeNum) {
        throw new BusinessLogicError(`Stock insuficiente para "${produto.nome}". Apenas ${produto.quantidadeEmEstoque} em stock.`);
    }

    produto.quantidadeEmEstoque -= quantidadeNum;
    
    orcamento.materiaisUsados.push({
        produto: produtoId,
        quantidade: quantidadeNum,
        custoNoMomento: produto.custoUnitario
    });

    const movimento = new MovimentoEstoque({
        produto: produtoId,
        contaId: contaId, // Adiciona o escopo da conta ao movimento
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

/**
 * Remove um material usado de um pedido e devolve-o ao estoque.
 * @param {string} contaId - O ID da conta do prestador.
 * @param {string} orcamentoId - O ID do orçamento.
 * @param {string} materialUsadoId - O ID do item no array 'materiaisUsados'.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const removerMaterial = async (contaId, orcamentoId, materialUsadoId) => {
    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId });
    if (!orcamento) {
        throw new NotFoundError("Pedido não encontrado ou não pertence à sua conta.");
    }

    const materialUsado = orcamento.materiaisUsados.id(materialUsadoId);
    if (!materialUsado) {
        throw new NotFoundError("Material não encontrado no pedido.");
    }

    const produto = await Produto.findOne({ _id: materialUsado.produto, contaId });
    if (produto) {
        produto.quantidadeEmEstoque += materialUsado.quantidade;
        await produto.save();
    }

    materialUsado.remove();

    const movimento = new MovimentoEstoque({
        produto: materialUsado.produto,
        contaId: contaId, // Adiciona o escopo da conta ao movimento
        tipo: 'Entrada',
        quantidade: materialUsado.quantidade,
        motivo: `Devolução do Pedido #${orcamento.shortId}`,
        orcamentoAssociado: orcamentoId
    });

    await orcamento.save();
    await movimento.save();

    return orcamento;
};

// Exportamos a função para que os controllers possam usá-la
module.exports = {
    agendarServico,
    atualizarStatus,
    submeterOrcamento,
    getClienteInfo, 
    adicionarMaterial,
    removerMaterial,
    gerarLinkPagamentoMercadoPago,
};
