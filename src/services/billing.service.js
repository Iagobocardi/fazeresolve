const Orcamento = require('../models/orcamento.model');
const Conta = require('../models/conta.model'); // MUDANÇA
const whatsappService = require('./whatsapp.service');

const processAutomaticBillings = async () => {
    console.log('[Billing Service] Iniciando o processo de cobranças automáticas.');

    // MUDANÇA: Itera sobre cada conta para processar as cobranças de forma isolada
    const todasAsContas = await Conta.find({ statusAssinatura: 'ATIVO' });

    for (const conta of todasAsContas) {
        console.log(`[Billing Service] Processando conta: ${conta.nome} (${conta._id})`);

        try {
            // Verifica se a conta tem um plano que permite automação (ex: Premium)
            if (conta.plano !== 'Premium') {
                console.log(`[Billing Service] Conta ${conta.nome} não tem plano Premium. Pulando.`);
                continue;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const threeDaysAgo = new Date(today);
            threeDaysAgo.setDate(today.getDate() - 3);

            // MUDANÇA: A busca por orçamentos agora é filtrada pelo contaId
            const orcamentosParaLembrete = await Orcamento.find({
                contaId: conta._id,
                statusPagamento: { $in: ['Pendente', 'Pago Parcial'] },
                dataVencimento: { $lt: threeDaysAgo },
                tipoUltimoLembrete: { $ne: 'AMIGAVEL' },
            }).populate('cliente');

            console.log(`[Billing Service] Encontrados ${orcamentosParaLembrete.length} orçamentos para enviar lembrete para a conta ${conta.nome}.`);

            for (const orcamento of orcamentosParaLembrete) {
                try {
                    // A lógica de renderização e envio permanece a mesma
                    const templateId = "ID_DO_TEMPLATE_AMIGAVEL"; // Isto precisaria ser buscado do DB ou config da conta
                    const { numeroDoCliente, mensagemFinal } = await whatsappService.renderTemplateMessage(templateId, orcamento._id);
                    await whatsappService.sendWhatsAppMessage(numeroDoCliente, mensagemFinal);

                    orcamento.ultimoLembreteEnviado = new Date();
                    orcamento.tipoUltimoLembrete = 'AMIGAVEL';
                    await orcamento.save();

                    console.log(`[Billing Service] Lembrete enviado para o pedido #${orcamento.shortId} da conta ${conta.nome}`);
                } catch (error) {
                    console.error(`[Billing Service] Erro ao processar o orçamento #${orcamento.shortId} da conta ${conta.nome}:`, error.message);
                }
            }
        } catch (error) {
            console.error(`[Billing Service] Erro fatal ao processar a conta ${conta._id}:`, error);
        }
    }

    console.log('[Billing Service] Processo de cobranças automáticas finalizado.');
};

module.exports = {
    processAutomaticBillings,
};
