const Cliente = require('../models/cliente.model');
const { Client } = require('@googlemaps/google-maps-services-js');
const dotenv = require('dotenv');
dotenv.config();

// Inicialize o cliente da API do Google Maps
const googleMapsClient = new Client({
  key: process.env.GOOGLE_MAPS_API_KEY,
});

const extractClientInfo = async (messageData) => {
    const text = messageData?.text?.body?.toLowerCase();
    const from = messageData?.from;

    if (text && from) {
        let nome = null;
        const nomeMatch = text.match(/meu nome é (.*?)(,|\.| )/);
        if (nomeMatch && nomeMatch[1]) {
            nome = nomeMatch[1].trim();
        }

        const localizacao = await getClientLocationFromText(text); // Obtém a localização

        return { nome, telefone: from, localizacao };
    }
     return { telefone: from };
};

const handleClientCadastro = async (clienteInfo) => {
    if (!clienteInfo.telefone) {
        throw new Error('Telefone do cliente não informado.');
    }

    let cliente = await Cliente.findOne({ telefone: clienteInfo.telefone });

    if (!cliente) {
        const novoCliente = new Cliente(clienteInfo);
        await novoCliente.save();
        return novoCliente;
    } else {
        // Se o cliente já existe, atualiza o nome e a localização, se fornecidos
        if (clienteInfo.nome && cliente.nome !== clienteInfo.nome) {
            cliente.nome = clienteInfo.nome;
        }
         if (clienteInfo.localizacao?.latitude && clienteInfo.localizacao?.longitude) {
            cliente.localizacao = clienteInfo.localizacao;
        }
        await cliente.save();
        return cliente;
    }
};

const sendWhatsAppMessage = async (phoneNumber, message) => {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.warn(
            "Credenciais do Twilio não configuradas. As mensagens do WhatsApp não serão enviadas."
        );
        return;
    }

    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    try {
        const response = await client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`, // Formato para Twilio WhatsApp
            to: `whatsapp:${phoneNumber}`,
        });
        console.log(`Mensagem enviada para ${phoneNumber}: ${response.sid}`);
    } catch (error) {
        console.error(`Erro ao enviar mensagem para ${phoneNumber}:`, error);
        throw error;
    }
};

/**
 * Obtém a localização do cliente a partir do texto da mensagem usando a API do Google Maps.
 * @param {string} text - O texto da mensagem do WhatsApp.
 * @returns {Promise<{latitude: number, longitude: number} | null>} - Um objeto com latitude e longitude, ou null se não for encontrada.
 */
const getClientLocationFromText = async (text) => {
  try {
    const locationRegex = /localização:\s*([-\d.]+),\s*([-\d.]+)/i;
    const match = text.match(locationRegex);

    if (match) {
      const latitude = parseFloat(match[1]);
      const longitude = parseFloat(match[2]);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        return { latitude, longitude };
      }
    }

    // Se a localização não estiver no formato de coordenadas, tenta geocodificar o endereço
    const addressRegex = /endereço:\s*(.*)/i;
    const addressMatch = text.match(addressRegex);
    if (addressMatch) {
      const address = addressMatch[1].trim();
      const response = await googleMapsClient.geocode({
        params: {
          address: address,
        },
      }).then((r) => {
        if (r.data.results && r.data.results.length > 0) {
          const location = r.data.results[0].geometry.location;
          return {
            latitude: location.lat,
            longitude: location.lng,
          };
        }
        return null;
      }).catch(e => {
        console.error("Geocode Error", e);
        return null;
      });
      return response;
    }
    return null;
  } catch (error) {
    console.error('Erro ao obter localização do cliente:', error);
    return null; // Retorna null em caso de erro para não quebrar o fluxo principal
  }
};

module.exports = {
    extractClientInfo,
    handleClientCadastro,
    sendWhatsAppMessage,
    getClientLocationFromText
};