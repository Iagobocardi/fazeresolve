const { google } = require('googleapis');
const axios = require('axios');
const Cliente = require('../models/cliente.model'); // Importar o modelo Cliente
/**
 * Controller para criar um novo evento no Google Calendar do utilizador.
 */
const createEvent = async (req, res) => {
  try {
    // 1. O ID do utilizador é obtido a partir do token JWT (pelo authMiddleware)
    const userId = req.user.id;

    // 2. Busca o utilizador na base de dados para obter os seus googleTokens
    const utilizador = await Cliente.findById(userId);

    if (!utilizador || !utilizador.googleTokens || !utilizador.googleTokens.access_token) {
      return res.status(401).json({ message: 'Utilizador não autenticado com o Google ou tokens inválidos. Por favor, associe a sua conta Google nas configurações.' });
    }

    // 3. Extrai os detalhes do evento do corpo da requisição.
    const { summary, description, startDateTime, endDateTime } = req.body;

    // Validação básica dos dados recebidos.
    if (!summary || !startDateTime || !endDateTime) {
      return res.status(400).json({ message: 'Dados do evento incompletos. É necessário fornecer título, data de início e data de fim.' });
    }

    // 4. Configura um novo cliente OAuth2 com as credenciais da sua aplicação.
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // 5. Define as credenciais do cliente com os tokens guardados no perfil do utilizador.
    oauth2Client.setCredentials(utilizador.googleTokens);

    // 6. Cria uma instância do serviço do Google Calendar.
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // 7. Monta o objeto do evento com os dados recebidos.
    const event = {
      summary: summary,
      description: description,
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Sao_Paulo',
      },
    };

    // 8. Tenta inserir o evento no calendário principal ('primary') do utilizador.
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
const searchImage = async (req, res) => {
  const { query } = req.body; // O nome do produto a ser pesquisado

  if (!query) {
    return res.status(400).json({ message: 'Um termo de busca é obrigatório.' });
  }

  // Lê as credenciais do ficheiro .env
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    return res.status(500).json({ message: 'As credenciais da API de busca do Google não estão configuradas no servidor.' });
  }

  const url = `https://www.googleapis.com/customsearch/v1`;

  try {
    const response = await axios.get(url, {
      params: {
        key: apiKey,
        cx: searchEngineId,
        q: query,
        searchType: 'image',
        num: 10 // Pede 10 imagens
      }
    });

    // Filtra e formata a resposta para enviar apenas o que o frontend precisa
    const images = response.data.items.map(item => ({
      link: item.link,
      title: item.title,
      snippet: item.snippet
    }));

    res.status(200).json({ items: images });

  } catch (error) {
    console.error('Erro ao buscar imagens no Google:', error.response?.data?.error || error.message);
    res.status(500).json({ message: 'Ocorreu um erro ao tentar buscar as imagens.' });
  }
};

module.exports = {
  createEvent,
  searchImage,
};