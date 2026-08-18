const cron = require('node-cron');
const Conta = require('../models/conta.model');

console.log('[Cron Job] Arquivo de job de período de carência carregado.');

// Agenda a tarefa para rodar todos os dias às 3:00 da manhã.
cron.schedule('0 3 * * *', async () => {
    console.log('[Cron Job] Executando verificação de períodos de carência expirados - ' + new Date().toLocaleString());

    try {
        const now = new Date();

        // Encontra todas as contas que estão em atraso e cujo período de carência já expirou.
        const expiredAccounts = await Conta.find({
            statusAssinatura: 'EM_ATRASO',
            gracePeriodExpiresAt: { $lt: now }
        });

        if (expiredAccounts.length === 0) {
            console.log('[Cron Job] Nenhuma conta com período de carência expirado encontrada.');
            return;
        }

        const accountIds = expiredAccounts.map(acc => acc._id);
        console.log(`[Cron Job] Contas a serem inativadas: ${accountIds.join(', ')}`);

        // Atualiza todas as contas encontradas para 'INATIVO'
        const updateResult = await Conta.updateMany(
            { _id: { $in: accountIds } },
            { $set: { statusAssinatura: 'INATIVO' } }
        );

        console.log(`[Cron Job] ${updateResult.nModified} contas foram inativadas com sucesso.`);

    } catch (error) {
        console.error('[Cron Job] Erro ao executar a tarefa de verificação de período de carência:', error);
    }
}, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
});
