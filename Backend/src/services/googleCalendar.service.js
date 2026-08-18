// src/services/googleCalendar.service.js

const { google } = require('googleapis');
const Conta = require('../models/conta.model.js');

/**
 * Cria um evento no Google Calendar do utilizador com base num orçamento agendado.
 * @param {object} orcamento - O documento completo do orçamento, que deve conter o contaId e os dados do cliente.
 */
const createEvent = async (orcamento) => {
    try {
        // O orçamento DEVE ter o contaId.
        if (!orcamento.contaId) {
            console.error('Erro: Orçamento sem contaId recebido pelo serviço do Google Calendar.');
            return;
        }

        const conta = await Conta.findById(orcamento.contaId);

        // A verificação agora é feita por conta.
        if (!conta || !conta.googleCalendarConnected || !conta.googleTokens?.refresh_token) {
            console.log(`Google Calendar não configurado para a conta ${orcamento.contaId}. A saltar.`);
            return;
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            // O callback URL deve ser o mesmo usado para obter os tokens
            `${process.env.API_URL || 'http://localhost:3000'}/api/configuracoes/google/callback`
        );

        oauth2Client.setCredentials(conta.googleTokens);
        
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const startTime = new Date(orcamento.dataAgendamento);
        // Define a duração padrão do evento como 1 hora.
        const endTime = new Date(startTime.getTime() + (60 * 60 * 1000)); 

        const event = {
            summary: `Serviço #${orcamento.shortId} - ${orcamento.cliente.nome}`,
            description: `<b>Descrição do Serviço:</b>\n${orcamento.descricao}\n\n<b>Cliente:</b> ${orcamento.cliente.nome}\n<b>Telefone:</b> ${orcamento.cliente.telefone}\n<b>Endereço:</b> ${orcamento.address}`,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'America/Sao_Paulo', // Fuso horário de São Paulo
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
            // Adiciona uma notificação push 30 minutos antes do evento
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', 'minutes': 30 },
                ],
            },
        };

        await calendar.events.insert({
            calendarId: 'primary', // Usa o calendário principal do utilizador
            resource: event,
        });

        console.log(`Evento para o pedido #${orcamento.shortId} criado com sucesso no Google Calendar.`);

    } catch (error) {
        console.error('ERRO AO CRIAR EVENTO NO GOOGLE CALENDAR:', error.message);
        // Importante: Não lançamos o erro para não quebrar o fluxo principal de agendamento
        // caso a integração com o calendário falhe por algum motivo (ex: token revogado).
    }
};

module.exports = { createEvent };
