// Em src/jobs/lembretes.job.js
const cron = require('node-cron');
const Orcamento = require('../models/orcamento.model'); // Ajuste o caminho se necessário
const whatsAppService = require('../services/whatsapp.service');
/**
 * Esta função busca os agendamentos de amanhã e envia os lembretes.
 */
const enviarLembretesDeAgendamento = async () => {
    console.log('\n--- [JOB] Tarefa de Lembretes Iniciada ---');

    try {
        // =======================================================
        // 👉 LÓGICA DE DATA CORRETA E CONFIÁVEL
        // =======================================================
        // A opção 'timezone' no cron.schedule já garante que este código roda no fuso correto.
        // Portanto, podemos usar a lógica de data padrão.
        const hoje = new Date();
        const amanha = new Date();
        amanha.setDate(hoje.getDate() + 1);

        const inicioAmanha = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate(), 0, 0, 0);
        const fimAmanha = new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate(), 23, 59, 59, 999);

        console.log(`[JOB] Buscando agendamentos entre ${inicioAmanha.toISOString()} e ${fimAmanha.toISOString()}`);

        // Query completa e correta
        const pedidosParaLembrar = await Orcamento.find({
            dataAgendamento: { $gte: inicioAmanha, $lte: fimAmanha },
            status: { $in: ['Agendado', 'Confirmado'] },
            lembreteEnviado: { $ne: true } // Importante para não enviar duas vezes
        }).populate('cliente', 'nome telefone');


        if (pedidosParaLembrar.length === 0) {
            console.log('[JOB] Nenhum agendamento encontrado para amanhã. Tarefa concluída.');
            console.log('--- [JOB] Tarefa de Lembretes Finalizada ---\n');
            return;
        }

        console.log(`[JOB] ENCONTRADO(S) ${pedidosParaLembrar.length} AGENDAMENTO(S) PARA ENVIAR LEMBRETE!`);

        for (const pedido of pedidosParaLembrar) {
            if (pedido.cliente && pedido.cliente.telefone) {
                const dataFormatada = new Date(pedido.dataAgendamento).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    dateStyle: 'short',
                    timeStyle: 'short'
                });
                
                const mensagem = `Olá, ${pedido.cliente.nome}! 👋 Passando para lembrar do seu serviço connosco amanhã, dia ${dataFormatada}. Até breve!`;
                
                console.log(`[JOB] => Enviando lembrete para ${pedido.cliente.nome} (${pedido.cliente.telefone})`);
                await whatsAppService.sendWhatsAppMessage(pedido.cliente.telefone, mensagem);

                // Marca o lembrete como enviado para evitar duplicidade
                pedido.lembreteEnviado = true;
                await pedido.save();
            }
        }

    } catch (error) {
        console.error('[JOB] Ocorreu um erro na tarefa de envio de lembretes:', error);
    } finally {
        console.log('--- [JOB] Tarefa de Lembretes Finalizada ---\n');
    }
};
// 4. Agenda a tarefa para rodar todos os dias às 8:00 da manhã
// A string '0 8 * * *' significa: no minuto 0, da hora 8, todos os dias do mês, todos os meses, todos os dias da semana.
console.log('Tarefa de Lembretes de Agendamento configurada para rodar diariamente às 8h.');
cron.schedule('0 8 * * *', enviarLembretesDeAgendamento, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
});
