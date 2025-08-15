require('dotenv').config();

const mercadoPagoConfig = {
    accessToken: process.env.MP_ACCESS_TOKEN,
};

module.exports = mercadoPagoConfig;
