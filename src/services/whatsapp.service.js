// Arquivo: src/services/whatsapp.service.js
// Versão FINAL, unindo a SUA lógica de conversa com as novas funcionalidades e correções estruturais.

const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const commandParser = require('./commandParser.js');

// 1. Cliente Twilio e número de telefone definidos UMA VEZ no topo do arquivo.
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioPhoneNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

// =======================================================
// FUNÇÃO 1: Enviar mensagens de texto ou com mídia
// =======================================================
const sendWhatsAppMessage = async (phoneNumber, message = '', mediaUrls = []) => {
    if (!phoneNumber) {
        console.error("[SERVICE] ERRO: Tentativa de enviar mensagem para um número indefinido.");
        return;
    }
    try {
        const messageData = { from: twilioPhoneNumber, to: `whatsapp:${phoneNumber}` };
        if (message && message.trim() !== '') { messageData.body = message; }
        if (mediaUrls && mediaUrls.length > 0) { messageData.mediaUrl = mediaUrls; }
        if (!messageData.body && !messageData.mediaUrl) { return; }
        await twilioClient.messages.create(messageData);
        console.log(`[SERVICE] Mensagem enviada com sucesso para ${phoneNumber}.`);
    } catch (error) {
        console.error("[SERVICE] ERRO AO ENVIAR VIA TWILIO:", error);
    }
};

// =======================================================
// FUNÇÃO 2: Enviar a pesquisa de satisfação INTERATIVA
// =======================================================
const sendSatisfactionSurvey = async (clientPhone, orcamentoId) => {
    try {
        const interactiveMessage = {
            interactive: {
                type: 'list',
                header: { type: 'text', text: 'Sua Opinião é Importante!' },
                body: { text: `Olá! Ficamos felizes em concluir seu serviço. 😊\n\nPara nos ajudar a melhorar, por favor, selecione uma nota de 1 a 5 estrelas.` },
                footer: { text: 'Agradecemos a preferência!' },
                action: {
                    button: 'Avalie nosso serviço',
                    sections: [{
                        title: 'Nível de Satisfação',
                        rows: [
                            { id: `rating_5_${orcamentoId}`, title: '⭐⭐⭐⭐⭐ (Excelente)' },
                            { id: `rating_4_${orcamentoId}`, title: '⭐⭐⭐⭐ (Bom)' },
                            { id: `rating_3_${orcamentoId}`, title: '⭐⭐⭐ (Regular)' },
                            { id: `rating_2_${orcamentoId}`, title: '⭐⭐ (Ruim)' },
                            { id: `rating_1_${orcamentoId}`, title: '⭐ (Péssimo)' },
                        ]
                    }]
                }
            }
        };
        await twilioClient.messages.create({
            from: twilioPhoneNumber,
            to: `whatsapp:${clientPhone}`,
            contentSid: process.env.TWILIO_CONTENT_SID,
            contentVariables: JSON.stringify(interactiveMessage)
        });
        console.log(`[Whatsapp Service] Pesquisa de satisfação enviada para ${clientPhone}.`);
    } catch (error) {
        console.error(`[Whatsapp Service] Erro ao enviar pesquisa de satisfação:`, error);
    }
};

// =======================================================
// FUNÇÃO 3: Checar status de pedidos (SUA FUNÇÃO ORIGINAL)
// =======================================================
const handleCheckOrderStatus = async (user) => {
    const activeOrders = await Orcamento.find({ cliente: user._id, status: { $nin: ['Finalizado', 'Rejeitado'] } }).sort({ data: -1 });
    if (activeOrders.length === 0) {
        return "Verifiquei aqui e não encontrei nenhum serviço em andamento para si. Se desejar, pode iniciar um novo pedido escolhendo a opção 1 no menu.";
    }
    if (activeOrders.length === 1) {
        const order = activeOrders[0];
        let statusMessage = `Encontrei o seu pedido *#${order.shortId}*.\n\n*Descrição:* ${order.descricao.slice(0, 50)}...\n*Estado Atual:* ${order.status}\n\n`;
        if (order.status === 'Agendado') { statusMessage += `Ele está confirmado para a data: *${order.dataAgendamento}*.`;
        } else if (order.status === 'Aceito') { statusMessage += `O seu orçamento de R$ ${order.valorProposto.toFixed(2)} foi aceite. Em breve, entraremos em contato para agendar.`; 
        } else { statusMessage += `A sua solicitação está na nossa fila para análise. Entraremos em contato assim que possível.`; }
        return statusMessage;
    }
    
    let orderListMessage = "Encontrei mais de um serviço em andamento. Para ver os detalhes, responda com `ver pedido [NÚMERO]`.\n\n";
    user.currentDemand = user.currentDemand || {};
    user.currentDemand.pendingOrderIds = activeOrders.map(order => order._id);
    activeOrders.forEach((order, index) => {
        orderListMessage += `*${index + 1}.* Pedido #${order.shortId} - "${order.descricao.slice(0, 30)}..."\n`;
    });
    user.conversationState = 'AWAITING_ORDER_SELECTION';
    await user.save();
    return orderListMessage;
};


// =======================================================
// FUNÇÃO 4: Lidar com TODAS as mensagens que chegam
// =======================================================
const handleIncomingMessage = async (req) => {
    try {
        const { From, ProfileName, Body, NumMedia, ButtonPayload } = req.body;
        const senderPhone = From.replace('whatsapp:', '');
        const messageBody = Body || '';
        const mediaUrls = [];
        if (NumMedia && parseInt(NumMedia) > 0) {
            for (let i = 0; i < NumMedia; i++) {
                mediaUrls.push(req.body[`MediaUrl${i}`]);
            }
        }

        // ETAPA 1: Processar respostas de botões/listas primeiro
        if (ButtonPayload && ButtonPayload.startsWith('rating_')) {
            const parts = ButtonPayload.split('_');
            const nota = parseInt(parts[1], 10);
            const orcamentoId = parts[2];
            const orcamento = await Orcamento.findById(orcamentoId);

            if (orcamento && !orcamento.notaSatisfacao) {
                orcamento.notaSatisfacao = nota;
                orcamento.historico.push({ evento: `Cliente avaliou o serviço com nota ${nota}.` });
                await orcamento.save();
                await sendWhatsAppMessage(senderPhone, 'Obrigado pelo seu feedback! 👍');
            }
            return; 
        }

        // ETAPA 2: Lógica de conversa normal (SEU CÓDIGO INTEGRADO)
        let user = await Cliente.findOne({ telefone: senderPhone });

        if (!user) {
            const clienteNome = ProfileName || `Cliente ${senderPhone.slice(-4)}`;
            if (senderPhone === process.env.PRESTADOR_TELEFONE) {
                await Cliente.create({ nome: "Prestador Principal", telefone: senderPhone, role: 'PRESTADOR', conversationState: 'NONE' });
                await sendWhatsAppMessage(senderPhone, "Modo de comando ativado. Para ver a lista de comandos, envie 'ajuda'.");
            } else {
                await Cliente.create({ nome: clienteNome, telefone: senderPhone, role: 'CLIENTE_FINAL', conversationState: 'AWAITING_REQUEST_TYPE' });
                const welcomeMessage = `Olá, ${clienteNome}! Bem-vindo(a) ao Faz&Resolve.\n\nComo podemos ajudar hoje?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente\n\n(A qualquer momento, envie *voltar* para ir ao passo anterior).`;
                await sendWhatsAppMessage(senderPhone, welcomeMessage);
            }
            return;
        }

        if (user.role === 'PRESTADOR') {
            const responseMessage = await commandParser.parseAndExecute(messageBody, user, sendWhatsAppMessage);
            if (responseMessage) { await sendWhatsAppMessage(user.telefone, responseMessage); }
        } else { // Role: 'CLIENTE_FINAL'
            const clientCommand = messageBody.toLowerCase().trim();
            if (clientCommand === 'voltar') {
                let previousState = 'AWAITING_REQUEST_TYPE';
                let replyMessage = '';
                switch (user.conversationState) {
                    case 'AWAITING_SERVICE_TYPE':
                        replyMessage = "Ok, voltamos ao menu principal. Como podemos ajudar?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente";
                        user.currentDemand = {};
                        break;
                    case 'AWAITING_ADDRESS':
                        previousState = 'AWAITING_SERVICE_TYPE';
                        replyMessage = "Ok, voltamos ao passo anterior. Por favor, descreva novamente o serviço que precisa.";
                        break;
                    case 'AWAITING_AVAILABILITY':
                        previousState = 'AWAITING_ADDRESS';
                        replyMessage = "Certo, voltamos um passo. Por favor, informe novamente o seu endereço.";
                        break;
                    default:
                        await sendWhatsAppMessage(user.telefone, "Você já está no menu principal. Não é possível voltar mais.");
                        return;
                }
                user.conversationState = previousState;
                await user.save();
                await sendWhatsAppMessage(user.telefone, replyMessage);
                return;
            }

            if (clientCommand === 'meu pedido' || clientCommand === 'status') {
                const statusResponse = await handleCheckOrderStatus(user);
                await sendWhatsAppMessage(user.telefone, statusResponse);
                return;
            }

            switch (user.conversationState) {
                case 'AWAITING_REQUEST_TYPE':
                    const option = messageBody.trim();
                    if (option === '1') {
                        user.currentDemand = { requestType: 'NOVO_SERVICO' };
                        user.conversationState = 'AWAITING_SERVICE_TYPE';
                        await user.save();
                        await sendWhatsAppMessage(user.telefone, "Com certeza! Para começarmos, por favor, descreva em detalhe o que você precisa. Se quiser, pode também enviar fotos ou vídeos do item.\n\n(Envie *voltar* para cancelar e retornar ao menu).");
                    } else if (option === '2') {
                        const statusResponse = await handleCheckOrderStatus(user);
                        await sendWhatsAppMessage(user.telefone, statusResponse);
                    } else if (option === '3') {
    await sendWhatsAppMessage(user.telefone, "Entendido. A sua solicitação foi enviada. Um dos nossos atendentes irá entrar em contato consigo nesta conversa em breve.");
    
    const prestadorPhone = process.env.PRESTADOR_TELEFONE;

    // === VERIFICAÇÃO DE SEGURANÇA ADICIONADA AQUI ===
    if (!prestadorPhone) {
        console.error("ALERTA: A variável PRESTADOR_TELEFONE não está definida no arquivo .env. Não é possível notificar o atendente.");
        return; // Sai da função para não dar erro
    }
    
    const clientPhoneNumber = user.telefone.replace(/\D/g, '');
    const whatsappLink = `https://wa.me/${clientPhoneNumber}`;
    const notificationToPrestador = `🔔 *Atenção: Cliente precisa de ajuda!*\n\nO cliente *${user.nome}* (${user.telefone}) solicitou falar com um atendente.\n\nClique aqui para abrir a conversa: ${whatsappLink}`;
    
    await sendWhatsAppMessage(prestadorPhone, notificationToPrestador);
} 
                    return;
                
                case 'AWAITING_ORDER_SELECTION':
                    const match = messageBody.toLowerCase().trim().match(/^(?:ver\s+)?pedido\s+(\d+)$/);
                    if (!match) {
                        await sendWhatsAppMessage(user.telefone, "Comando não entendido. Por favor, responda no formato `ver pedido [NÚMERO]`.");
                        return;
                    }
                    const selectedIndex = parseInt(match[1]) - 1;
                    const pendingOrderIds = user.currentDemand.pendingOrderIds;
                    if (pendingOrderIds && selectedIndex >= 0 && selectedIndex < pendingOrderIds.length) {
                        const selectedOrderId = pendingOrderIds[selectedIndex];
                        const selectedOrder = await Orcamento.findById(selectedOrderId);
                        let statusMessage = `Detalhes do pedido *#${selectedOrder.shortId}*:\n\n*Descrição:* ${selectedOrder.descricao.slice(0, 50)}...\n*Estado Atual:* ${selectedOrder.status}\n\n`;
                        if (selectedOrder.status === 'Agendado') { statusMessage += `Ele está confirmado para a data: *${selectedOrder.dataAgendamento}*.`; }
                        else if (selectedOrder.status === 'Aceito') { statusMessage += `O seu orçamento de R$ ${selectedOrder.valorProposto.toFixed(2)} foi aceite. Em breve, entraremos em contato para agendar.`; }
                        else { statusMessage += `A sua solicitação está na nossa fila para análise.`; }
                        await sendWhatsAppMessage(user.telefone, statusMessage);
                    } else {
                        await sendWhatsAppMessage(user.telefone, "Seleção inválida. O número que você enviou não corresponde a nenhum pedido da lista.");
                    }
                    user.conversationState = 'AWAITING_REQUEST_TYPE';
                    user.currentDemand = {};
                    await user.save();
                    break;

                case 'AWAITING_SERVICE_TYPE': 
                    user.currentDemand = user.currentDemand || {};
                    user.currentDemand.description = messageBody;
                    if (mediaUrls && mediaUrls.length > 0) {
                        user.currentDemand.media = mediaUrls.map(url => ({ url: url, sid: url.split('/').pop() }));
                    }
                    user.conversationState = 'AWAITING_ADDRESS';
                    await user.save();
                    await sendWhatsAppMessage(user.telefone, "Recebido! Agora, por favor, informe o seu endereço completo.\n\n(Envie *voltar* para corrigir a descrição).");
                    break;

                case 'AWAITING_ADDRESS':
                    user.currentDemand.address = messageBody;
                    user.conversationState = 'AWAITING_AVAILABILITY';
                    await user.save();
                    await sendWhatsAppMessage(user.telefone, "Endereço anotado. Para finalizar, por favor, diga-nos qual a melhor data e período para si.\n\n(Envie *voltar* para corrigir o endereço).");
                    break;

                case 'AWAITING_AVAILABILITY':
                    user.currentDemand.availability = messageBody;
                    user.conversationState = 'COMPLETED';
                    const newOrcamento = await Orcamento.create({
                        cliente: user._id,
                        tipo: 'ORCAMENTO',
                        descricao: user.currentDemand.description,
                        media: user.currentDemand.media,
                        address: user.currentDemand.address,
                        dataAgendamento: user.currentDemand.availability,
                        historico: [{ evento: 'Pedido criado pelo cliente via WhatsApp.' }] // Adiciona histórico na criação
                    });
                    user.currentDemand = {};
                    await user.save();
                    
                    await sendWhatsAppMessage(user.telefone, "Tudo certo! A sua solicitação foi registada. Entraremos em contato em breve para confirmar.\n\nObrigado por usar o Faz & Resolve!");
                    const prestadorPhone = process.env.PRESTADOR_TELEFONE;
                    const notificationToPrestador = `🔔 *Novo Pedido Recebido!* (#${newOrcamento.shortId})\n\n` +
                                                  `*Cliente:* ${user.nome}\n` +
                                                  `*Descrição:* ${newOrcamento.descricao.slice(0, 80)}...\n\n` +
                                                  `Para ver todos os detalhes, envie: \`ver ${newOrcamento.shortId}\``;
                    await sendWhatsAppMessage(prestadorPhone, notificationToPrestador);
                    break;
                
                case 'COMPLETED':
                    await sendWhatsAppMessage(user.telefone, "Olá! O seu último pedido já foi registado. Para iniciar uma nova solicitação, escolha uma das opções abaixo.");
                    user.conversationState = 'AWAITING_REQUEST_TYPE';
                    await user.save();
                    const newRequestMessage = `Como podemos ajudar hoje?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente`;
                    await sendWhatsAppMessage(user.telefone, newRequestMessage);
                    break;
                
                default:
                    user.conversationState = 'AWAITING_REQUEST_TYPE';
                    await user.save();
                    await sendWhatsAppMessage(user.telefone, "Ocorreu um erro, vamos recomeçar. Como podemos ajudar?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente");
                    break;
            }
        }
    } catch (error) {
        console.error("[SERVICE] ERRO GERAL E INESPERADO:", error);
    }
};

// =======================================================
// EXPORTANDO AS FUNÇÕES CORRETAMENTE
// =======================================================
module.exports = {
    handleIncomingMessage,
    sendWhatsAppMessage,
    sendSatisfactionSurvey
};