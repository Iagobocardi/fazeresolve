// whatsapp.service.js - Versão Refatorada

const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model'); // Exemplo: para salvar a solicitação final
const { Client } = require('@googlemaps/google-maps-services-js');
const dotenv = require('dotenv');
dotenv.config();

const googleMapsClient = new Client({}); // A inicialização pode ser feita aqui

// A função sendWhatsAppMessage continua a mesma, está ótima.
const sendWhatsAppMessage = async (phoneNumber, message) => {
    // ... seu código para enviar mensagem via Twilio ...
};

// A função getClientLocationFromText também pode ser mantida e usada no momento certo.
const getClientLocationFromText = async (text) => {
    // ... seu código para geocodificação ...
};

/**
 * Função principal que orquestra a conversa com o cliente.
 * Esta função substitui a necessidade de 'extractClientInfo' e 'handleClientCadastro' separados.
 * @param {object} senderInfo - Objeto com { name, phone } do remetente.
 * @param {string} messageBody - O corpo da mensagem recebida.
 */
const handleIncomingMessage = async (senderInfo, messageBody) => {
    // 1. Encontra ou cria o cliente para saber o estado da conversa
    let cliente = await Cliente.findOne({ telefone: senderInfo.phone });

    if (!cliente) {
        cliente = await Cliente.create({
            nome: senderInfo.name, // O nome do perfil do WhatsApp já é um bom começo
            telefone: senderInfo.phone,
            conversationState: 'AWAITING_SERVICE_TYPE' // Inicia o fluxo
        });

        const welcomeMessage = `Olá, ${senderInfo.name}! Bem-vindo(a) ao Faz&Resolve. Sou seu assistente virtual. Para começar, por favor, descreva o serviço que você precisa (ex: 'reforma de um sofá', 'orçamento para pintura').`;
        await sendWhatsAppMessage(cliente.telefone, welcomeMessage);
        return; // Aguarda a próxima mensagem do cliente
    }

    // 2. Processa a mensagem com base no estado atual da conversa
    switch (cliente.conversationState) {
        case 'AWAITING_SERVICE_TYPE':
            cliente.currentDemand = { description: messageBody }; // Salva a descrição
            cliente.conversationState = 'AWAITING_ADDRESS';
            await cliente.save();
            await sendWhatsAppMessage(cliente.telefone, "Entendido! Agora, por favor, me informe o seu endereço completo para a visita ou coleta.");
            break;

        case 'AWAITING_ADDRESS':
            // Usa sua função de geocodificação aqui!
            const location = await getClientLocationFromText(`endereço: ${messageBody}`);
            
            cliente.currentDemand.address = messageBody; // Salva o endereço textual
            if (location) {
                cliente.localizacao = { // Atualiza a localização principal do cliente
                    latitude: location.latitude,
                    longitude: location.longitude,
                    enderecoCompleto: messageBody
                };
            }
            cliente.conversationState = 'AWAITING_AVAILABILITY';
            await cliente.save();
            await sendWhatsAppMessage(cliente.telefone, "Endereço anotado! E qual seria o melhor período para o agendamento? (ex: 'qualquer dia de manhã', 'terças ou quintas à tarde').");
            break;

        case 'AWAITING_AVAILABILITY':
            cliente.currentDemand.availability = messageBody; // Salva a disponibilidade
            
            // --- PASSO FINAL: Criação do registro e finalização ---
            const finalMessage = `Perfeito! Sua solicitação foi registrada e enviada para nossa equipe.\n\n*Resumo:*\n- *Serviço:* ${cliente.currentDemand.description}\n- *Endereço:* ${cliente.currentDemand.address}\n- *Disponibilidade:* ${cliente.currentDemand.availability}\n\nEm breve entraremos em contato.`;
            await sendWhatsAppMessage(cliente.telefone, finalMessage);

            // Opcional mas recomendado: Crie um registro formal (Orçamento, Agendamento etc.)
            await Orcamento.create({
                cliente: cliente._id,
                // Assumindo que você tem um campo para a descrição no modelo Orcamento
                descricaoServico: cliente.currentDemand.description, 
                status: 'Pendente', // Status inicial
                // Preencha outros campos relevantes...
            });

            // Reseta o estado da conversa para que o cliente possa fazer novos pedidos no futuro
            cliente.conversationState = 'NONE';
            cliente.currentDemand = {}; // Limpa a demanda atual
            await cliente.save();
            break;

        default: // 'NONE' ou 'COMPLETED'
            // Reinicia o fluxo se o cliente mandar uma nova mensagem
            cliente.conversationState = 'AWAITING_SERVICE_TYPE';
            await cliente.save();
            await sendWhatsAppMessage(cliente.telefone, `Olá, ${cliente.nome}! Como posso te ajudar hoje? Por favor, descreva o serviço que você precisa.`);
            break;
    }
};

module.exports = {
    handleIncomingMessage, // Exporte a nova função principal
    sendWhatsAppMessage,
    // getClientLocationFromText, // Pode ser exportada ou usada apenas internamente
};