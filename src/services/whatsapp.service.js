// Arquivo: src/services/whatsapp.service.js
// Versão com opções para o cliente melhoradas e correção do erro de validação de estado.

// ===============================================================
// 1. IMPORTAÇÕES
// ===============================================================
const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const commandParser = require('./commandParser.js');

// ===============================================================
// 2. FUNÇÃO AUXILIAR DE ENVIO
// ===============================================================
const sendWhatsAppMessage = async (phoneNumber, message) => {
    if (!phoneNumber) {
        console.error("[SERVICE] ERRO FATAL: Tentativa de enviar mensagem para um número indefinido.");
        return;
    }

    try {
        const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${phoneNumber}`,
        });
        console.log(`[SERVICE] Mensagem de resposta enviada com sucesso para ${phoneNumber}.`);
    } catch (error) {
        console.error("[SERVICE] ERRO AO ENVIAR VIA TWILIO:", error);
    }
};

// ===============================================================
// 3. FUNÇÃO PRINCIPAL
// ===============================================================
const handleIncomingMessage = async (senderInfo, messageBody, mediaUrls = []) => {
    try {
        const senderPhone = senderInfo.phone;
        let user = await Cliente.findOne({ telefone: senderPhone });

        // --- LÓGICA PARA NOVOS UTILIZADORES ---
        if (!user) {
            const clienteNome = senderInfo.name || `Cliente ${senderPhone.slice(-4)}`;
            let userDataToCreate;

            if (senderPhone === process.env.PRESTADOR_TELEFONE) {
                console.log('[SERVICE] Reconhecido como PRESTADOR.');
                userDataToCreate = {
                    nome: "Prestador Principal",
                    telefone: senderPhone,
                    role: 'PRESTADOR',
                    conversationState: 'NONE'
                };
                await Cliente.create(userDataToCreate);
                await sendWhatsAppMessage(senderPhone, "Modo de comando ativado. Aguardando instruções.");
            } else {
                console.log('[SERVICE] Reconhecido como NOVO CLIENTE FINAL.');
                userDataToCreate = {
                    nome: clienteNome,
                    telefone: senderPhone,
                    role: 'CLIENTE_FINAL',
                    conversationState: 'AWAITING_REQUEST_TYPE',
                };
                await Cliente.create(userDataToCreate);
                
                // --- OPÇÕES MELHORADAS PARA O CLIENTE ---
                const welcomeMessage = `Olá, ${clienteNome}! Bem-vindo(a) ao Faz&Resolve. Como podemos ajudar hoje?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente`;
                await sendWhatsAppMessage(senderPhone, welcomeMessage);
            }
            return;
        }

        // --- LÓGICA PARA UTILIZADORES EXISTENTES ---
        if (user.role === 'PRESTADOR') {
            console.log('[SERVICE] A executar lógica de comando para PRESTADOR...');
            await sendWhatsAppMessage(user.telefone, `Comando "${messageBody}" recebido para processamento.`);
        } else { // Role: 'CLIENTE_FINAL'
            console.log(`[SERVICE] A processar cliente. Estado atual: ${user.conversationState}`);

            switch (user.conversationState) {
                case 'AWAITING_REQUEST_TYPE':
                    const option = messageBody.trim();

                    if (option === '1') {
                        user.currentDemand = { requestType: 'NOVO_SERVICO' };
                        // CORREÇÃO DO ERRO: O estado agora corresponde ao definido no modelo
                        user.conversationState = 'AWAITING_SERVICE_TYPE';
                        await user.save();
                        await sendWhatsAppMessage(user.telefone, "Com certeza! Para começarmos, por favor, descreva em detalhe o que você precisa. Se quiser, pode também enviar fotos ou vídeos do item.");
                    } else if (option === '2') {
                        await sendWhatsAppMessage(user.telefone, "Para consultar o estado do seu serviço, por favor, informe o número do seu pedido.");
                        // Futuramente, mudaríamos o estado para 'AWAITING_ORDER_ID', por exemplo.
                    } else if (option === '3') {
                        await sendWhatsAppMessage(user.telefone, "Entendido. Um dos nossos atendentes irá entrar em contato consigo nesta conversa em breve.");
                        // Aqui, você poderia implementar uma notificação para o prestador.
                    } else {
                        await sendWhatsAppMessage(user.telefone, "Opção inválida. Por favor, responda com o número da opção desejada (1, 2 ou 3).");
                    }
                    return;

                // CORREÇÃO DO ERRO: O nome do case agora corresponde ao definido no modelo
                case 'AWAITING_SERVICE_TYPE': 
                    user.currentDemand.description = messageBody;
                    if (mediaUrls && mediaUrls.length > 0) {
                        user.currentDemand.mediaUrls = mediaUrls;
                    }
                    user.conversationState = 'AWAITING_ADDRESS';
                    await user.save();
                    await sendWhatsAppMessage(user.telefone, "Recebido! Agora, por favor, informe o seu endereço completo para que possamos avaliar a logística.");
                    break;
                
                case 'AWAITING_ADDRESS':
                    user.currentDemand.address = messageBody;
                    user.conversationState = 'AWAITING_AVAILABILITY';
                    await user.save();
                    await sendWhatsAppMessage(user.telefone, "Endereço anotado. Para finalizar, qual é o melhor período (manhã, tarde) e dia para uma possível visita ou retirada?");
                    break;

                case 'AWAITING_AVAILABILITY':
                    user.currentDemand.availability = messageBody;
                    user.conversationState = 'COMPLETED';
                    await user.save();

                    await Orcamento.create({
                        cliente: user._id,
                        tipo: 'ORCAMENTO', // Pode ser ajustado conforme a necessidade
                        descricao: user.currentDemand.description,
                        mediaUrls: user.currentDemand.mediaUrls,
                    });

                    await sendWhatsAppMessage(user.telefone, "Tudo certo! Recebemos todas as suas informações. A nossa equipa analisará o seu pedido e entrará em contato em breve.\n\nObrigado por usar o Faz & Resolve!");
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

// ===============================================================
// 4. EXPORTAÇÃO
// ===============================================================
module.exports = {
    handleIncomingMessage
};
