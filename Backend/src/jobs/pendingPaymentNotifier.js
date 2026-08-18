const cron = require('node-cron');
const Conta = require('../models/conta.model');
const Notificacao = require('../models/notificacao.model');

// Este job está agendado para rodar todos os dias às 10:00 da manhã.
// O formato é: 'minuto hora dia-do-mês mês dia-da-semana'
const schedule = '0 10 * * *'; 

const pendingPaymentNotifierJob = cron.schedule(schedule, async () => {
    console.log('--- Iniciando job: Verificador de Pagamentos Pendentes ---');
    
    try {
        const contasComPagamentoPendente = await Conta.find({
            statusAssinatura: { $in: ['EM_ATRASO', 'AGUARDANDO_PAGAMENTO'] }
        }).select('_id');

        if (contasComPagamentoPendente.length === 0) {
            console.log('Nenhuma conta com pagamento pendente encontrada.');
            console.log('--- Finalizando job ---');
            return;
        }

        console.log(`Encontradas ${contasComPagamentoPendente.length} contas com pagamento pendente.`);

        const notificacoes = contasComPagamentoPendente.map(conta => ({
            contaId: conta._id,
            mensagem: 'Sua assinatura está com o pagamento pendente. Atualize seus dados de pagamento para evitar a interrupção dos serviços.',
            tipo: 'PAGAMENTO'
        }));
        
        // Usar um Set para evitar criar notificações duplicadas na mesma execução do job
        // Primeiro, buscamos as notificações de pagamento já existentes e não lidas para essas contas
        const contasJaNotificadas = await Notificacao.find({
            contaId: { $in: contasComPagamentoPendente.map(c => c._id) },
            tipo: 'PAGAMENTO',
            lida: false
        }).select('contaId');

        const idsDeContasJaNotificadas = new Set(contasJaNotificadas.map(n => n.contaId.toString()));

        const novasNotificacoes = notificacoes.filter(n => !idsDeContasJaNotificadas.has(n.contaId.toString()));

        if (novasNotificacoes.length > 0) {
            await Notificacao.insertMany(novasNotificacoes);
            console.log(`${novasNotificacoes.length} novas notificações de pagamento pendente foram criadas.`);
        } else {
            console.log('Nenhuma nova notificação precisou ser criada (usuários já notificados).');
        }

    } catch (error) {
        console.error('Erro ao executar o job de verificação de pagamentos pendentes:', error);
    }
    
    console.log('--- Finalizando job: Verificador de Pagamentos Pendentes ---');
}, {
    scheduled: false, // Inicia desabilitado, vamos habilitar no server.js
    timezone: "America/Sao_Paulo"
});

module.exports = pendingPaymentNotifierJob;
