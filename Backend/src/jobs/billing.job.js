const cron = require('node-cron');
const billingService = require('../services/billing.service.js');

console.log('[Cron Job] Arquivo de job de cobrança carregado.');

// Agenda a tarefa para rodar todos os dias às 9:00 da manhã.
// Expressão Cron: '0 9 * * *' (minuto 0, hora 9, todo dia, todo mês, todo dia da semana)
cron.schedule('0 9 * * *', async () => {
    console.log('[Cron Job] Executando a tarefa de verificação de cobranças automáticas - ' + new Date().toLocaleString());

    try {
        await billingService.processAutomaticBillings();
    } catch (error) {
        console.error('[Cron Job] Erro ao executar a tarefa de cobrança:', error);
    }
}, {
    scheduled: true,
    timezone: "America/Sao_Paulo" // É uma boa prática definir o fuso horário.
});
