// Carrega as variáveis de ambiente.
require('dotenv').config();

const mercadoPagoConfig = {
    accessToken: process.env.MP_ACCESS_TOKEN,
    appId: process.env.MP_APP_ID, // Adicionado o APP_ID para o fluxo OAuth
};

module.exports = mercadoPagoConfig;
