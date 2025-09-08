// Em: src/services/orcamento.service.js
const Orcamento = require('../models/orcamento.model');
const Produto = require('../models/produto.model');
const MovimentoEstoque = require('../models/movimentoEstoque.model'); 
const { MercadoPagoConfig, Preference } = require('mercadopago');
const Configuracao = require('../models/configuracao.model');
const Cliente = require('../models/cliente.model');
const googleCalendarService = require('./googleCalendar.service.js'); // O import já estava correto
const financeiroService = require('./financeiro.service.js');

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
    // A configuração global ainda pode ser necessária para a taxa de marketplace
    const config = await Configuracao.obterConfiguracao();

    // 2. Perform validations
    if (!orcamento) {
        throw new NotFoundError('Orçamento não encontrado ou não pertence a esta conta.');
    }
    if (!conta) {
        throw new NotFoundError('Conta do prestador não encontrada.');
    }
    // A verificação de permissão agora é feita pela query com contaId.
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
        marketplace_fee: (orcamento.valorProposto * config.taxaMarketplace) / 100,
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
 * @param {string} orcamentoId - O ID do orçamento a ser agendado.
 * @param {string|Date} dataAgendamento - A data para a qual o serviço será agendado.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const agendarServico = async (contaId, orcamentoId, dataAgendamento) => {
    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).populate('cliente', 'nome telefone');

    if (!orcamento) {
        throw new NotFoundError('Orçamento não encontrado ou não pertence a esta conta.');
    }

    const parsedDate = parseCustomDate(dataAgendamento);

    if (!parsedDate) {
        throw new Error(`Formato de data de agendamento inválido: "${dataAgendamento}"`);
    }

    orcamento.status = 'Agendado';
    orcamento.dataAgendamento = parsedDate;
    orcamento.historico.push({ evento: `Serviço agendado para ${parsedDate.toLocaleString('pt-BR')}.` });
    
    const orcamentoSalvo = await orcamento.save();
    
    // A lógica de notificação foi movida para o controller.
    // A criação de evento no Google Calendar é uma lógica de negócio que pertence aqui.
    googleCalendarService.createEvent(orcamentoSalvo);

    return orcamentoSalvo;
};

/**
 * Contém a lógica de negócio para atualizar o status de um orçamento.
 * @param {string} orcamentoId - O ID do orçamento a ser atualizado.
 * @param {string} novoStatus - O novo status a ser aplicado.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const Transacao = require('../models/transacao.model.js'); // Importar o novo modelo

const atualizarStatus = async (contaId, orcamentoId, novoStatus) => {
    const allowedStatus = ['Pendente', 'Aceito', 'Agendado', 'Finalizado', 'Rejeitado'];
    if (!allowedStatus.includes(novoStatus)) {
        throw new BusinessLogicError('Status inválido fornecido.');
    }

    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).populate('cliente', 'nome telefone');
    if (!orcamento) {
        throw new NotFoundError('Orçamento não encontrado ou não pertence a esta conta.');
    }
    
    const statusAntigo = orcamento.status;
    
    orcamento.status = novoStatus;
    orcamento.historico.push({ evento: `Status alterado para "${novoStatus}".` });

    // Se o status for alterado para 'Finalizado', cria as transações financeiras
    if (novoStatus === 'Finalizado' && statusAntigo !== 'Finalizado') {
        orcamento.dataFinalizacao = new Date();
        
        // A lógica de criação de transação foi movida para o controller de orçamentos,
        // na função de adicionar pagamento, para garantir que a transação seja criada no momento do pagamento.
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
const submeterOrcamento = async (contaId, orcamentoId, valorProposto) => {
    if (!valorProposto || isNaN(valorProposto) || valorProposto <= 0) {
        throw new BusinessLogicError('Valor do orçamento é obrigatório e deve ser um número positivo.');
    }

    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).populate('cliente', 'nome telefone');
    if (!orcamento) {
        throw new NotFoundError('Orçamento não encontrado ou não pertence a esta conta.');
    }

    orcamento.valorProposto = parseFloat(valorProposto);
    orcamento.status = 'Aceito';
    orcamento.historico.push({ evento: `Orçamento de R$ ${orcamento.valorProposto.toFixed(2)} aceite pelo prestador.` });
    
    const orcamentoSalvo = await orcamento.save();

    return orcamentoSalvo;
};

/**
 * Obtém as informações do cliente associado a um orçamento.
 * @param {string} orcamentoId - O ID do orçamento.
 * @returns {Promise<Object>} O objeto do cliente.
 */
const getClienteInfo = async (contaId, orcamentoId) => {
    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).populate('cliente', 'nome');
    if (!orcamento || !orcamento.cliente) {
        throw new NotFoundError('Cliente não encontrado para este orçamento ou orçamento não pertence a esta conta.');
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
const adicionarMaterial = async (contaId, orcamentoId, produtoId, quantidade) => {
    const quantidadeNum = Number(quantidade);

    if (!produtoId || !quantidadeNum || quantidadeNum <= 0) {
        throw new BusinessLogicError("ID do produto e quantidade válida são obrigatórios.");
    }

    const [produto, orcamento] = await Promise.all([
        Produto.findOne({ _id: produtoId, contaId }),
        Orcamento.findOne({ _id: orcamentoId, contaId })
    ]);

    if (!produto || !orcamento) {
        throw new NotFoundError("Pedido ou produto não encontrado nesta conta.");
    }

    if (produto.quantidadeEmEstoque < quantidadeNum) {
        throw new Error(`Stock insuficiente para "${produto.nome}". Apenas ${produto.quantidadeEmEstoque} em stock.`);
    }

    produto.quantidadeEmEstoque -= quantidadeNum;

    // Lógica de verificação de estoque baixo
    if (produto.quantidadeEmEstoque <= produto.estoqueMinimo) {
        produto.alertaEstoqueBaixo = true;
    }
    
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

/**
 * Remove um material usado de um pedido e devolve-o ao estoque.
 * @param {string} orcamentoId - O ID do orçamento.
 * @param {string} materialUsadoId - O ID do item no array 'materiaisUsados'.
 * @returns {Promise<Document>} O documento do orçamento atualizado.
 */
const removerMaterial = async (contaId, orcamentoId, materialUsadoId) => {
    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId });
    if (!orcamento) {
        throw new NotFoundError("Pedido não encontrado ou não pertence a esta conta.");
    }

    const materialUsado = orcamento.materiaisUsados.id(materialUsadoId);
    if (!materialUsado) {
        throw new NotFoundError("Material não encontrado no pedido.");
    }

    const produto = await Produto.findOne({ _id: materialUsado.produto, contaId });
    if (produto) {
        produto.quantidadeEmEstoque += materialUsado.quantidade;

        // Lógica para desativar o alerta se o estoque voltar ao normal
        if (produto.quantidadeEmEstoque > produto.estoqueMinimo) {
            produto.alertaEstoqueBaixo = false;
        }
        
        await produto.save();
    }

    // Remove o subdocumento do array
    materialUsado.remove();

    const movimento = new MovimentoEstoque({
        produto: materialUsado.produto,
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
const enviarCobrancaComDesconto = async (contaId, orcamentoId, desconto, templateId) => {
    // 1. Validação de entrada
    if (!templateId) {
        throw new BusinessLogicError('O ID do template de mensagem é obrigatório.');
    }
    const descontoNum = Number(desconto);
    if (isNaN(descontoNum) || descontoNum < 0 || descontoNum > 100) {
        throw new BusinessLogicError('A percentagem de desconto deve ser um número entre 0 e 100.');
    }

    // 2. Busca dos dados necessários
    const orcamento = await Orcamento.findOne({ _id: orcamentoId, contaId }).populate('cliente');
    if (!orcamento) {
        throw new NotFoundError('Orçamento não encontrado ou não pertence a esta conta.');
    }
    if (!orcamento.cliente) {
        throw new NotFoundError('Cliente associado ao orçamento não encontrado.');
    }
    const conta = await Conta.findById(contaId);
    if (!conta || conta.metodoRecebimento !== 'MERCADOPAGO' || !conta.credenciaisMercadoPago) {
        throw new BusinessLogicError('O método de recebimento não está configurado corretamente como Mercado Pago.');
    }

    // 3. Cálculo do novo valor
    const valorOriginal = orcamento.valorProposto;
    if (valorOriginal <= 0) {
        throw new BusinessLogicError('O orçamento não tem um valor proposto para aplicar desconto.');
    }
    const valorComDesconto = valorOriginal * (1 - (descontoNum / 100));

    // 4. Geração do link de pagamento do Mercado Pago para o valor com desconto
    const client = new MercadoPagoConfig({ accessToken: conta.credenciaisMercadoPago.accessToken });
    const preference = new Preference(client);
    const preferencePayload = {
        items: [{
            id: orcamento._id.toString(),
            title: `Pagamento com desconto para o pedido #${orcamento.shortId}`,
            description: orcamento.descricao,
            quantity: 1,
            unit_price: valorComDesconto,
            currency_id: 'BRL',
        }],
        payer: { name: orcamento.cliente.nome, email: orcamento.cliente.email },
        back_urls: { success: `${process.env.FRONTEND_URL}/payment-success` },
        external_reference: orcamentoId,
    };
    const result = await preference.create({ body: preferencePayload });
    const novoLinkPagamento = result.init_point;

    // 5. Renderizar o template de WhatsApp usando o ID
    const templateData = {
        cliente: orcamento.cliente.toObject(),
        orcamento: orcamento.toObject(),
        valorComDesconto: valorComDesconto.toFixed(2),
        desconto: `${descontoNum}%`,
        linkPagamento: novoLinkPagamento
    };
    const mensagem = await whatsappService.renderTemplateById(templateId, contaId, templateData);
    if (!mensagem) {
        // O erro já vem do renderTemplateById, mas podemos adicionar contexto
        throw new Error('Não foi possível renderizar a mensagem a partir do template selecionado.');
    }

    // 6. Enviar a mensagem via WhatsApp
    await whatsappService.sendWhatsAppMessage(orcamento.cliente.telefone, mensagem);

    // 7. Salvar o histórico
    orcamento.historico.push({ evento: `Enviada cobrança com ${descontoNum}% de desconto via WhatsApp usando template.` });
    await orcamento.save();

    return { success: true, message: 'Mensagem de cobrança enviada com sucesso!' };
};

module.exports = {
    agendarServico,
    atualizarStatus,
    submeterOrcamento,
    getClienteInfo, 
    adicionarMaterial,
    removerMaterial,
    gerarLinkPagamentoMercadoPago,
    enviarCobrancaComDesconto,
};
