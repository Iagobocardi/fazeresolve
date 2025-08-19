// testMercadoPago.js
require('dotenv').config();
const { MercadoPagoConfig, PreApprovalPlan } = require('mercadopago');

async function testMercadoPagoAuth() {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  console.log("--- INICIANDO TESTE DE AUTENTICAÇÃO ---");
  console.log("Access Token a ser testado:", accessToken);

  if (!accessToken) {
    console.error("\nERRO: A variável MP_ACCESS_TOKEN não foi encontrada no seu ficheiro .env!");
    console.log("--------------------------------------");
    return;
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: accessToken });
    const plan = new PreApprovalPlan(client);

    // Tentamos listar os planos. Se a chave for inválida, isto irá falhar.
    const result = await plan.search();
    
    console.log("\n✅ SUCESSO! A autenticação com o Mercado Pago funcionou.");
    console.log("Resposta da API (lista de planos):", result);
    console.log("--------------------------------------");

  } catch (error) {
    console.error("\n❌ FALHA NA AUTENTICAÇÃO!");
    console.error("O Mercado Pago recusou a sua chave de acesso com o seguinte erro:");
    console.error(error);
    console.log("\nPor favor, verifique se a chave no seu ficheiro .env está correta e reinicie o servidor.");
    console.log("--------------------------------------");
  }
}

testMercadoPagoAuth();
