// Arquivo: src/jobs/satisfactionSurvey.js
// Esta tarefa agendada envia pesquisas de satisfação automaticamente.

const cron = require('node-cron');
const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');
const whatsAppService = require('../services/whatsapp.service');

// Agenda a tarefa para rodar todos os dias às 9h da manhã.
// A expressão significa: "aos 0 minutos, da 9ª hora, todos os dias do mês, todos os meses, todos os dias da semana".
console.log('[CRON] Tarefa de pesquisa de satisfação inicializada.');

const runSatisfactionSurveyJob = async () => {
    console.log('[CRON] Executando a verificação de pesquisas de satisfação...');

    try {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const pedidosParaPesquisa = await Orcamento.find({
            status: 'Finalizado',
            pesquisaEnviada: false,
            dataFinalizacao: { $lte: twoDaysAgo }
        }).populate('cliente', 'nome telefone'); // O .populate já traz os dados do cliente

        if (pedidosParaPesquisa.length === 0) {
            console.log('[CRON] Nenhum pedido encontrado para enviar pesquisa hoje.');
            return;
        }

        console.log(`[CRON] Encontrados ${pedidosParaPesquisa.length} pedidos para enviar pesquisa.`);

        for (const pedido of pedidosParaPesquisa) {
            if (pedido.cliente && pedido.cliente.telefone) {
                // =======================================================
                // 👉 LÓGICA CORRIGIDA E COMPLETA DENTRO DO LOOP
                // =======================================================

                // 1. Envia a pesquisa interativa (esta mensagem já contém o texto de introdução)
                await whatsAppService.sendSatisfactionSurvey(pedido); // Passa o objeto completo do pedido
                console.log(`[CRON] Pesquisa interativa enviada para o pedido #${pedido.shortId}.`);

                // 2. Encontra o documento completo do Cliente para podermos alterar o seu estado
                const cliente = await Cliente.findById(pedido.cliente._id);
                if (cliente) {
                    // 3. Coloca o cliente no "modo de espera por avaliação"
                    cliente.conversationState = 'AWAITING_RATING';
                    cliente.pendingRating = { orcamentoId: pedido._id.toString() };
                    
                    // 4. Marca a pesquisa como enviada no documento do Pedido
                    pedido.pesquisaEnviada = true;

                    // 5. Salva ambas as alterações (no Cliente e no Pedido) de forma atómica
                    await Promise.all([cliente.save(), pedido.save()]);

                    console.log(`[JOB] Cliente ${cliente.telefone} movido para o estado AWAITING_RATING para o pedido ${pedido.shortId}.`);
                }
            }
        }

    } catch (error) {
        console.error('[CRON] Erro ao executar a tarefa de pesquisa de satisfação:', error);
    }
};

// Agenda a tarefa para rodar (ajuste o tempo conforme necessário)
cron.schedule('* 8 * * *', runSatisfactionSurveyJob, { // Temporariamente a cada minuto para teste
    scheduled: true,
    timezone: "America/Sao_Paulo"
});


