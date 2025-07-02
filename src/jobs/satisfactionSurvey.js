// Arquivo: src/jobs/satisfactionSurvey.js
// Esta tarefa agendada envia pesquisas de satisfação automaticamente.

const cron = require('node-cron');
const Orcamento = require('../models/orcamento.model');
const { sendWhatsAppMessage } = require('../services/whatsapp.service'); // Precisamos de importar a função de envio

console.log('[CRON] Tarefa de pesquisa de satisfação inicializada.');

// Agenda a tarefa para rodar todos os dias às 9h da manhã.
// A expressão significa: "aos 0 minutos, da 9ª hora, todos os dias do mês, todos os meses, todos os dias da semana".
cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Executando a verificação de pesquisas de satisfação...');

    try {
        // Calcula a data de 2 dias atrás
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        // Encontra pedidos que foram finalizados há mais de 2 dias e que ainda não receberam a pesquisa.
        const pedidosParaPesquisa = await Orcamento.find({
            status: 'Finalizado',
            pesquisaEnviada: false,
            dataFinalizacao: { $lte: twoDaysAgo }
        }).populate('cliente', 'nome telefone');

        if (pedidosParaPesquisa.length === 0) {
            console.log('[CRON] Nenhum pedido encontrado para enviar pesquisa hoje.');
            return;
        }

        console.log(`[CRON] Encontrados ${pedidosParaPesquisa.length} pedidos para enviar pesquisa.`);

        // Envia a pesquisa para cada pedido encontrado
        for (const orcamento of pedidosParaPesquisa) {
            if (orcamento.cliente && orcamento.cliente.telefone) {
                const surveyMessage = `Olá, ${orcamento.cliente.nome}! Vimos que o seu serviço para "${orcamento.descricao.slice(0, 30)}..." foi concluído há alguns dias. Para nos ajudar a melhorar, numa escala de 1 a 5, como você avalia a sua experiência geral connosco?`;
                
                await sendWhatsAppMessage(orcamento.cliente.telefone, surveyMessage);

                // Marca a pesquisa como enviada para não enviar novamente
                orcamento.pesquisaEnviada = true;
                await orcamento.save();

                console.log(`[CRON] Pesquisa enviada para o pedido #${orcamento.shortId}.`);
            }
        }

    } catch (error) {
        console.error('[CRON] Erro ao executar a tarefa de pesquisa de satisfação:', error);
    }
}, {
    scheduled: true,
    timezone: "America/Sao_Paulo" // Importante para garantir que rode no fuso horário correto
});
