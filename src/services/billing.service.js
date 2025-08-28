const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');
const whatsappService = require('./whatsapp.service');

const processAutomaticBillings = async () => {
    console.log('[Billing Service] Iniciando o processo de cobranças automáticas.');

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normaliza para o início do dia

    // Lógica para encontrar os orçamentos que precisam de lembrete
    // Esta é uma implementação simplificada da lógica discutida.
    // Em um cenário real, as queries seriam mais complexas.

    // Exemplo: Encontra orçamentos vencidos há 3 dias que não receberam lembrete amigável
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    const orcamentosParaLembrete = await Orcamento.find({
        statusPagamento: { $in: ['Pendente', 'Pago Parcial'] },
        dataVencimento: { $lt: threeDaysAgo }, // Vencido há mais de 3 dias
        tipoUltimoLembrete: { $ne: 'AMIGAVEL' }, // Que ainda não receberam este tipo de lembrete
    }).populate('cliente').populate('prestadorId');

    console.log(`[Billing Service] Encontrados ${orcamentosParaLembrete.length} orçamentos para enviar lembrete.`);

    for (const orcamento of orcamentosParaLembrete) {
        const prestador = orcamento.prestadorId;

        // Verifica se o prestador é Premium e tem a automação ativa
        // (A lógica do plano 'Premium' precisaria ser verificada aqui)
        if (prestador && prestador.role === 'PRESTADOR' /* && prestador.plano === 'Premium' */) {

            // Assume que existe um template com o título "Lembrete Amigável"
            // A função renderTemplateMessage já lida com a lógica de link ou pix
            const templateId = "ID_DO_TEMPLATE_AMIGAVEL"; // Isto precisaria ser buscado do DB

            try {
                const { numeroDoCliente, mensagemFinal } = await whatsappService.renderTemplateMessage(templateId, orcamento._id);

                await whatsappService.sendWhatsAppMessage(numeroDoCliente, mensagemFinal);

                // Atualiza o orçamento para não enviar o mesmo lembrete de novo
                orcamento.ultimoLembreteEnviado = new Date();
                orcamento.tipoUltimoLembrete = 'AMIGAVEL';
                await orcamento.save();

                console.log(`[Billing Service] Lembrete enviado para o pedido #${orcamento.shortId}`);

            } catch (error) {
                console.error(`[Billing Service] Erro ao processar o orçamento #${orcamento.shortId}:`, error.message);
            }
        }
    }

    console.log('[Billing Service] Processo de cobranças automáticas finalizado.');
};

module.exports = {
    processAutomaticBillings,
};
