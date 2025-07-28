const { google } = require('googleapis');

/**
 * Controller para criar um novo evento no Google Calendar do utilizador.
 */
const createEvent = async (req, res) => {
  // 1. Verifica se os tokens de autenticação do Google existem na sessão do utilizador.
  //    Estes tokens devem ter sido guardados após o fluxo de login com o Google.
  if (!req.session.tokens) {
    return res.status(401).json({ message: 'Utilizador não autenticado com o Google.' });
  }

  // 2. Extrai os detalhes do evento do corpo da requisição.
  const { summary, description, startDateTime, endDateTime } = req.body;

  // Validação básica dos dados recebidos.
  if (!summary || !startDateTime || !endDateTime) {
    return res.status(400).json({ message: 'Dados do evento incompletos. É necessário fornecer título, data de início e data de fim.' });
  }

  // 3. Configura um novo cliente OAuth2 com as credenciais da sua aplicação.
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // O URI de redirecionamento configurado na Google Cloud Console
  );

  // 4. Define as credenciais do cliente com os tokens guardados na sessão.
  oauth2Client.setCredentials(req.session.tokens);

  // 5. Cria uma instância do serviço do Google Calendar.
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // 6. Monta o objeto do evento com os dados recebidos.
  const event = {
    summary: summary,
    description: description,
    start: {
      dateTime: startDateTime, // Formato ISO: '2025-07-25T09:00:00-03:00'
      timeZone: 'America/Sao_Paulo', // Recomendo usar um fuso horário explícito.
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Sao_Paulo',
    },
    // Opcional: Adicionar participantes
    // attendees: [
    //   { email: 'email.do.cliente@example.com' },
    // ],
  };

  // 7. Tenta inserir o evento no calendário principal ('primary') do utilizador.
  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log('Evento criado com sucesso: %s', response.data.htmlLink);
    res.status(201).json({ message: 'Evento criado com sucesso!', link: response.data.htmlLink });

  } catch (error) {
    console.error('Erro ao criar evento no Google Calendar:', error);
    res.status(500).json({ message: 'Ocorreu um erro ao tentar criar o evento no Google Calendar.' });
  }
};

module.exports = {
  createEvent,
};
