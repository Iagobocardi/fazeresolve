// Em: src/jobs/dunning.job.js (Lógica v1.1 - Corrigida)

const cron = require('node-cron');
const Assinatura = require('../models/subscription.model');
const Usuario = require('../models/usuario.model');

/**
 * Job de Dunning (Gestão de Inadimplência) e Limpeza.
 * Roda uma vez por dia, à meia-noite.
 */
const dunningJob = cron.schedule('0 0 * * *', async () => {
    console.log('[Cron Job - Dunning] Iniciando verificação diária de assinaturas...');
    const agora = new Date();

    // --- 1. Bloqueio de Contas com Carência Expirada ---
    try {
        const assinaturasEmCarenciaExpirada = await Assinatura.find({
            status: 'pagamento_pendente',
            carenciaExpiraEm: { $lt: agora }
        });

        if (assinaturasEmCarenciaExpirada.length > 0) {
            console.log(`[Cron Job - Dunning] Encontradas ${assinaturasEmCarenciaExpirada.length} assinaturas com carência expirada.`);
            for (const assinatura of assinaturasEmCarenciaExpirada) {
                const usuario = await Usuario.findById(assinatura.userId);
                if (usuario) {
                    // Atualiza a assinatura para 'pausada'
                    assinatura.status = 'pausada';
                    await assinatura.save();

                    // Bloqueia o acesso do usuário
                    usuario.status = 'bloqueado_pagamento';
                    await usuario.save();

                    console.log(`[Cron Job - Dunning] Assinatura ${assinatura._id} movida para 'pausada' e usuário ${usuario._id} para 'bloqueado_pagamento'.`);

                    // TODO: Disparar E-mail 2: "Seu acesso ao Faz&Resolve foi suspenso".
                }
            }
        } else {
            console.log('[Cron Job - Dunning] Nenhuma assinatura com carência expirada encontrada.');
        }
    } catch (error) {
        console.error('[Cron Job - Dunning] Erro ao processar contas com carência expirada:', error);
    }

    // --- 2. Verificação de Segurança: Assinaturas Pendentes por Muito Tempo ---
    try {
        const limitePendencia = new Date();
        limitePendencia.setHours(limitePendencia.getHours() - 72); // 72 horas atrás

        const assinaturasPendentesAntigas = await Assinatura.find({
            status: 'pendente_confirmacao',
            createdAt: { $lt: limitePendencia }
        });

        if (assinaturasPendentesAntigas.length > 0) {
            console.log(`[Cron Job - Dunning] Encontradas ${assinaturasPendentesAntigas.length} assinaturas em 'pendente_confirmacao' há mais de 72h.`);
            for (const assinatura of assinaturasPendentesAntigas) {
                // Marca a assinatura como 'pausada' para revisão manual ou cancelamento.
                assinatura.status = 'pausada';
                await assinatura.save();

                const usuario = await Usuario.findById(assinatura.userId);
                if (usuario && usuario.status === 'ativo') {
                    // Reverte o status do usuário para inativo, pois a confirmação nunca chegou.
                    usuario.status = 'inativo';
                    await usuario.save();
                    console.log(`[Cron Job - Dunning] Assinatura pendente ${assinatura._id} movida para 'pausada' e usuário ${usuario._id} para 'inativo'.`);
                }
            }
        } else {
            // CORREÇÃO: Uso de aspas duplas para evitar o erro de sintaxe.
            console.log("[Cron Job - Dunning] Nenhuma assinatura em 'pendente_confirmacao' antiga encontrada.");
        }
    } catch (error) {
        console.error("[Cron Job - Dunning] Erro na verificação de segurança de assinaturas pendentes:", error);
    }

    console.log('[Cron Job - Dunning] Verificação diária concluída.');
}, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
});

module.exports = dunningJob;
