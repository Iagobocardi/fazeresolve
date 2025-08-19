// Carrega as variáveis de ambiente novamente para garantir que estão disponíveis.
require('dotenv').config();

// Adicionamos um log para depuração. Isto irá mostrar no seu terminal
// qual chave está a ser realmente usada pela sua aplicação.
console.log('[MercadoPago Config] Access Token a ser usado:', process.env.MP_ACCESS_TOKEN);

const mercadoPagoConfig = {
    accessToken: process.env.MP_ACCESS_TOKEN,
};

module.exports = mercadoPagoConfig;
