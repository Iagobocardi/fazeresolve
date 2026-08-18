// Carrega as variáveis de ambiente.
require('dotenv').config();

const mercadoPagoConfig = {
    accessToken: process.env.MP_ACCESS_TOKEN,
    appId: process.env.MP_APP_ID,
    clientSecret: process.env.MERCADO_PAGO_CLIENT_SECRET,
};

module.exports = mercadoPagoConfig;
