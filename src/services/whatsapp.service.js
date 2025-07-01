// Arquivo: src/services/whatsapp.service.js
// Corrigida a notificação para o prestador e o fluxo de seleção de múltiplos pedidos.

const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const commandParser = require('./commandParser.js');

const sendWhatsAppMessage = async (phoneNumber, message = '', mediaUrls = []) => {
    if (!phoneNumber) {
        console.error("[SERVICE] ERRO FATAL: Tentativa de enviar mensagem para um número indefinido. Verifique se a variável de ambiente PRESTADOR_TELEFONE está configurada corretamente no seu ficheiro .env e se o seu servidor foi iniciado com 'require('dotenv').config()'.");
        return;
    }
    try {
        const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const messageData = { from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`, to: `whatsapp:${phoneNumber}` };
        if (message && message.trim() !== '') { messageData.body = message; }
        if (mediaUrls && mediaUrls.length > 0) { messageData.mediaUrl = mediaUrls; }
        if (!messageData.body && !messageData.mediaUrl) { return; }
        await client.messages.create(messageData);
        console.log(`[SERVICE] Mensagem enviada com sucesso para ${phoneNumber}.`);
    } catch (error) {
        console.error("[SERVICE] ERRO AO ENVIAR VIA TWILIO:", error);
    }
};

const handleIncomingMessage = async (senderInfo, messageBody, mediaUrls = []) => {
    try {
        const senderPhone = senderInfo.phone;
        let user = await Cliente.findOne({ telefone: senderPhone });

        if (!user) {
            // ... (Lógica para novos utilizadores permanece a mesma)
            const clienteNome = senderInfo.name || `Cliente ${senderPhone.slice(-4)}`;
            let userDataToCreate;
            if (senderPhone === process.env.PRESTADOR_TELEFONE) {
                userDataToCreate = { nome: "Prestador Principal", telefone: senderPhone, role: 'PRESTADOR', conversationState: 'NONE' };
                await Cliente.create(userDataToCreate);
                await sendWhatsAppMessage(senderPhone, "Modo de comando ativado. Para ver a lista de comandos, envie 'ajuda'.");
            } else {
                userDataToCreate = { nome: clienteNome, telefone: senderPhone, role: 'CLIENTE_FINAL', conversationState: 'AWAITING_REQUEST_TYPE' };
                await Cliente.create(userDataToCreate);
                const welcomeMessage = `Olá, ${clienteNome}! Bem-vindo(a) ao Faz&Resolve. Como podemos ajudar hoje?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente`;
                await sendWhatsAppMessage(senderPhone, welcomeMessage);
            }
            return;
        }

        if (user.role === 'PRESTADOR') {
            const responseMessage = await commandParser.parseAndExecute(messageBody, user, sendWhatsAppMessage);
            if (responseMessage) {
                await sendWhatsAppMessage(user.telefone, responseMessage);
            }
        } else { // Role: 'CLIENTE_FINAL'
            switch (user.conversationState) {
                case 'AWAITING_REQUEST_TYPE':
                    const option = messageBody.trim();
                    if (option === '1') {
                        user.currentDemand = { requestType: 'NOVO_SERVICO' };
                        user.conversationState = 'AWAITING_SERVICE_TYPE';
                        await user.save();
                        await sendWhatsAppMessage(user.telefone, "Com certeza! Para começarmos, por favor, descreva em detalhe o que você precisa. Se quiser, pode também enviar fotos ou vídeos do item.");
                    
                    } else if (option === '2') {
                        const activeOrders = await Orcamento.find({ cliente: user._id, status: { $nin: ['Finalizado', 'Rejeitado'] } }).sort({ data: -1 });

                        if (activeOrders.length === 0) {
                            await sendWhatsAppMessage(user.telefone, "Verifiquei aqui e não encontrei nenhum serviço em andamento para si.");
                        } else if (activeOrders.length === 1) {
                            const order = activeOrders[0];
                            let statusMessage = `Encontrei o seu pedido *#${order.shortId}*.\n\n*Descrição:* ${order.descricao.slice(0, 50)}...\n*Estado Atual:* ${order.status}\n\n`;
                            if (order.status === 'Agendado') { statusMessage += `Ele está confirmado para a data: *${order.dataAgendamento}*.`; }
                            else if (order.status === 'Aceito') { statusMessage += `O seu orçamento de R$ ${order.valorProposto.toFixed(2)} foi aceite. Em breve, entraremos em contato para agendar.`; }
                            else { statusMessage += `A sua solicitação está na nossa fila para análise. Entraremos em contato assim que possível.`; }
                            await sendWhatsAppMessage(user.telefone, statusMessage);
                        } else {
                            // CORREÇÃO: A mensagem de instrução agora é mais clara.
                            let orderListMessage = "Encontrei mais de um serviço em andamento. Para ver os detalhes, responda com `ver pedido [NÚMERO]`.\n\n";
                            user.currentDemand.pendingOrderIds = activeOrders.map(order => order._id);
                            activeOrders.forEach((order, index) => {
                                orderListMessage += `*${index + 1}.* Pedido #${order.shortId} - "${order.descricao.slice(0, 30)}..."\n`;
                            });
                            user.conversationState = 'AWAITING_ORDER_SELECTION';
                            await user.save();
                            await sendWhatsAppMessage(user.telefone, orderListMessage);
                        }

                    } else if (option === '3') {
                        await sendWhatsAppMessage(user.telefone, "Entendido. A sua solicitação foi enviada. Um dos nossos atendentes irá entrar em contato consigo nesta conversa em breve.");
                        const prestadorPhone = process.env.PRESTADOR_TELEFONE;
                        const clientPhoneNumber = user.telefone.replace(/\D/g, '');
                        const whatsappLink = `https://wa.me/${clientPhoneNumber}`;
                        const notificationToPrestador = `🔔 *Atenção: Cliente precisa de ajuda!*\n\nO cliente *${user.nome}* (${user.telefone}) solicitou falar com um atendente.\n\nClique aqui para abrir a conversa: ${whatsappLink}`;
                        await sendWhatsAppMessage(prestadorPhone, notificationToPrestador);

                    } else {
                        await sendWhatsAppMessage(user.telefone, "Opção inválida. Por favor, responda com o número da opção desejada (1, 2 ou 3).");
                    }
                    return;
                
                case 'AWAITING_ORDER_SELECTION':
                    // CORREÇÃO: A lógica agora espera um comando, não apenas um número.
                    const match = messageBody.toLowerCase().trim().match(/^(?:ver\s+)?pedido\s+(\d+)$/);

                    if (!match) {
                        await sendWhatsAppMessage(user.telefone, "Comando não entendido. Por favor, responda no formato `ver pedido [NÚMERO]`, por exemplo: `ver pedido 1`.");
                        return;
                    }

                    const selectedIndex = parseInt(match[1]) - 1;
                    const pendingOrderIds = user.currentDemand.pendingOrderIds;

                    if (pendingOrderIds && selectedIndex >= 0 && selectedIndex < pendingOrderIds.length) {
                        const selectedOrderId = pendingOrderIds[selectedIndex];
                        const selectedOrder = await Orcamento.findById(selectedOrderId);

                        let statusMessage = `Detalhes do pedido *#${selectedOrder.shortId}*:\n\n`;
                        statusMessage += `*Descrição:* ${selectedOrder.descricao.slice(0, 50)}...\n`;
                        statusMessage += `*Estado Atual:* ${selectedOrder.status}\n\n`;
                        if (selectedOrder.status === 'Agendado') { statusMessage += `Ele está confirmado para a data: *${selectedOrder.dataAgendamento}*.`; }
                        else if (selectedOrder.status === 'Aceito') { statusMessage += `O seu orçamento de R$ ${selectedOrder.valorProposto.toFixed(2)} foi aceite. Em breve, entraremos em contato para agendar.`; }
                        else { statusMessage += `A sua solicitação está na nossa fila para análise. Entraremos em contato assim que possível.`; }
                        
                        await sendWhatsAppMessage(user.telefone, statusMessage);
                    } else {
                        await sendWhatsAppMessage(user.telefone, "Seleção inválida. O número que você enviou não corresponde a nenhum pedido da lista.");
                    }
                    
                    user.conversationState = 'AWAITING_REQUEST_TYPE';
                    user.currentDemand = {};
                    await user.save();
                    break;

                // ... (outros cases permanecem os mesmos)
                case 'AWAITING_SERVICE_TYPE': 
                    user.currentDemand.description = messageBody;
                    if (mediaUrls && mediaUrls.length > 0) {
                        user.currentDemand.media = mediaUrls.map(url => ({ url: url, sid: url.split('/').pop() }));
                    }
                    user.conversationState = 'AWAITING_ADDRESS';
                    await user.save();
                    await sendWhatsAppMessage(user.telefone, "Recebido! Agora, por favor, informe o seu endereço completo para que possamos avaliar a logística.");
                    break;
                case 'AWAITING_ADDRESS':
                    user.currentDemand.address = messageBody;
                    user.conversationState = 'AWAITING_AVAILABILITY';
                    await user.save();
                    await sendWhatsAppMessage(user.telefone, "Endereço anotado. Para finalizar, por favor, diga-nos qual a melhor data e período (manhã/tarde) para si.");
                    break;
                case 'AWAITING_AVAILABILITY':
                    user.currentDemand.availability = messageBody;
                    user.conversationState = 'COMPLETED';
                    await Orcamento.create({
                        cliente: user._id,
                        tipo: 'ORCAMENTO',
                        descricao: user.currentDemand.description,
                        media: user.currentDemand.media,
                        address: user.currentDemand.address,
                        dataAgendamento: user.currentDemand.availability
                    });
                    user.currentDemand = {};
                    await user.save();
                    await sendWhatsAppMessage(user.telefone, "Tudo certo! A sua solicitação foi registada com a sua sugestão de data. Entraremos em contato em breve para confirmar.\n\nObrigado por usar o Faz & Resolve!");
                    break;
                case 'COMPLETED':
                    await sendWhatsAppMessage(user.telefone, "Olá! O seu último pedido já foi registado. Para iniciar uma nova solicitação, basta escolher uma das opções que vou enviar novamente.");
                    user.conversationState = 'AWAITING_REQUEST_TYPE';
                    await user.save();
                    const newRequestMessage = `Como podemos ajudar hoje?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente`;
                    await sendWhatsAppMessage(user.telefone, newRequestMessage);
                    break;
                default:
                    user.conversationState = 'AWAITING_REQUEST_TYPE';
                    await user.save();
                    await sendWhatsAppMessage(user.telefone, "Ocorreu um erro na nossa conversa, vamos recomeçar. Por favor, escolha uma das opções que vou enviar.");
                    const defaultWelcome = `Como podemos ajudar?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente`;
                    await sendWhatsAppMessage(user.telefone, defaultWelcome);
                    break;
            }
        }
    } catch (error) {
        console.error("[SERVICE] ERRO GERAL E INESPERADO:", error);
    }
};

module.exports = {
    handleIncomingMessage
};
