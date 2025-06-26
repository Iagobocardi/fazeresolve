// Arquivo: src/services/whatsapp.service.js
const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');

// Função que envia a resposta via Twilio
const sendWhatsAppMessage = async (phoneNumber, message) => {
    try {
        const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: `whatsapp:${phoneNumber}`,
        });
        console.log(`[SERVICE] Mensagem de resposta enviada com sucesso para ${phoneNumber}.`);
    } catch (error) {
        console.error("[SERVICE] ERRO AO ENVIAR MENSAGEM VIA TWILIO:", error);
    }
};

// Função principal que processa a mensagem e a lógica do bot
const handleIncomingMessage = async (senderInfo, messageBody) => {
    console.log(`[SERVICE] A processar mensagem de ${senderInfo.phone}`);
    try {
        let cliente = await Cliente.findOne({ telefone: senderInfo.phone });

        if (!cliente) {
            console.log(`[SERVICE] Cliente novo. A criar...`);
            const clienteNome = senderInfo.name || `Cliente ${senderInfo.phone.slice(-4)}`;
            cliente = await Cliente.create({
                nome: clienteNome,
                telefone: senderInfo.phone,
                conversationState: 'AWAITING_SERVICE_TYPE'
            });
            await sendWhatsAppMessage(cliente.telefone, `Olá! Bem-vindo(a) ao Faz&Resolve. Para começar, por favor, descreva o serviço que precisa.`);
            return;
        }

        console.log(`[SERVICE] Cliente existente. Estado da conversa: ${cliente.conversationState}`);
        
        switch (cliente.conversationState) {
            case 'AWAITING_SERVICE_TYPE':
                cliente.currentDemand = { description: messageBody };
                cliente.conversationState = 'AWAITING_ADDRESS';
                await cliente.save();
                await sendWhatsAppMessage(cliente.telefone, "Entendido! Agora, por favor, informe o seu endereço completo para a visita ou coleta.");
                break;

            case 'AWAITING_ADDRESS':
                cliente.currentDemand.address = messageBody;
                cliente.conversationState = 'AWAITING_AVAILABILITY';
                await cliente.save();
                await sendWhatsAppMessage(cliente.telefone, "Endereço anotado! E qual seria o melhor período para o agendamento? (ex: 'qualquer dia de manhã').");
                break;

            case 'AWAITING_AVAILABILITY':
                cliente.currentDemand.availability = messageBody;
                
                const finalMessage = `Perfeito! A sua solicitação foi registada com sucesso e enviada para a nossa equipa.\n\n*Resumo:*\n- *Serviço:* ${cliente.currentDemand.description}\n- *Endereço:* ${cliente.currentDemand.address}\n- *Disponibilidade:* ${cliente.currentDemand.availability}\n\nEm breve entraremos em contacto.`;
                await sendWhatsAppMessage(cliente.telefone, finalMessage);

                // Cria o registo de Orçamento no final
                await Orcamento.create({
                    cliente: cliente._id,
                    descricao: `Solicitação via WhatsApp: ${cliente.currentDemand.description}`,
                    status: 'Pendente'
                });

                // Reseta a conversa
                cliente.conversationState = 'NONE';
                cliente.currentDemand = {};
                await cliente.save();
                break;

            default: // 'NONE' ou estado inesperado
                cliente.conversationState = 'AWAITING_SERVICE_TYPE';
                await cliente.save();
                await sendWhatsAppMessage(cliente.telefone, `Olá, ${cliente.nome}! Como posso ajudar hoje? Por favor, descreva o serviço que precisa.`);
                break;
        }

    } catch (error) {
        console.error("[SERVICE] ERRO CRÍTICO na lógica do serviço:", error);
    }
};

module.exports = {
    handleIncomingMessage
};
