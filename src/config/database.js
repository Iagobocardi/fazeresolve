// Arquivo: src/config/database.js

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // CORREÇÃO: Usando MONGODB_URI, o mesmo nome que está no seu ficheiro .env
        await mongoose.connect(process.env.MONGODB_URI, {
            // Opções de conexão podem ser adicionadas aqui se necessário no futuro
        });
        console.log('MongoDB conectado com sucesso!');
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error.message);
        // Em caso de erro, termina o processo para evitar que a aplicação rode sem base de dados
        process.exit(1);
    }
};

module.exports = connectDB;
