const cron = require('node-cron');
const AgendamentoMensagem = require('../models/agendamentoMensagem.model.js');
const Cliente = require('../models/cliente.model.js');
const whatsappService = require('../services/whatsapp.service.js');

const enviarMensagensAgendadas = async () => {
    console.log('[CRON] Executando tarefa de envio de mensagens agendadas...');
    
    const agora = new Date();
    const mensagensParaEnviar = await AgendamentoMensagem.find({
        status: 'pendente',
        dataEnvio: { $lte: agora }
    });

    if (mensagensParaEnviar.length === 0) {
        console.log('[CRON] Nenhuma mensagem agendada para enviar agora.');
        return;
    }

    console.log(`[CRON] Encontradas ${mensagensParaEnviar.length} mensagens para enviar.`);

    for (const agendamento of mensagensParaEnviar) {
        try {
            const cliente = await Cliente.findById(agendamento.clienteId);
            if (!cliente || !cliente.telefone) {
                throw new Error(`Cliente com ID ${agendamento.clienteId} não encontrado ou sem telefone.`);
            }

            // Usa a função de serviço refatorada, passando o contaId
            await whatsappService.sendWhatsAppMessage(
                agendamento.contaId,
                cliente.telefone,
                agendamento.mensagem
            );

            agendamento.status = 'enviado';
            console.log(`[CRON] Mensagem agendada ID ${agendamento._id} enviada com sucesso.`);

        } catch (error) {
            console.error(`[CRON] Erro ao enviar mensagem agendada ID ${agendamento._id}:`, error.message);
            agendamento.status = 'falhou';
            agendamento.erro = error.message;
        } finally {
            await agendamento.save();
        }
    }
    console.log('[CRON] Tarefa de envio de mensagens agendadas finalizada.');
};

// Agenda a tarefa para rodar a cada minuto
cron.schedule('* * * * *', enviarMensagensAgendadas, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
});

console.log('[CRON] Tarefa de envio de mensagens agendadas configurada para rodar a cada minuto.');
