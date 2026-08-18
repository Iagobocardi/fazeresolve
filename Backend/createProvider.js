// Arquivo: createProvider.js
require('dotenv').config();
const mongoose = require('mongoose');
const Cliente = require('./src/models/cliente.model'); // Importa o seu modelo de Cliente
const connectDB = require('./src/config/database'); // Importa a sua função de conexão

// --- CONFIGURE OS SEUS DADOS AQUI ---
const providerData = {
    nome: "Prestador Pri",
    // Use o mesmo número de telefone que está no seu .env para os testes do WhatsApp
    telefone: "5515997687850", // Ex: "5515999998888"
    // Defina uma senha que você usará APENAS para obter o token de teste via Postman
    password: "SenhaSuperForteParaTestes1234", 
    role: "PRESTADOR"
};
// ------------------------------------

const createProvider = async () => {
    console.log('A tentar conectar à base de dados...');
    await connectDB();
    console.log('Conectado com sucesso.');

    try {
        // Verifica se um prestador com este telefone já existe
        const existingProvider = await Cliente.findOne({ telefone: providerData.telefone });

        if (existingProvider) {
            console.log('Utilizador Prestador já existe na base de dados.');
            return;
        }

        // Se não existir, cria um novo
        console.log('A criar novo utilizador Prestador...');
        const provider = new Cliente(providerData);
        await provider.save(); // O 'pre-save' hook no seu modelo irá encriptar a senha automaticamente

        console.log('✅ Utilizador Prestador criado com sucesso!');
        console.log('Nome:', provider.nome);
        console.log('Telefone:', provider.telefone);

    } catch (error) {
        console.error('❌ Erro ao criar o utilizador Prestador:', error);
    } finally {
        // Fecha a conexão com a base de dados
        await mongoose.disconnect();
        console.log('Desconectado da base de dados.');
    }
};

// Executa a função
createProvider();