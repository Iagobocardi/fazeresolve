// Arquivo: src/config/database.js

const mongoose = require('mongoose');

const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI não foi definido. Copie .env.example para .env e configure o MongoDB.');
    }

    try {
        // A conexão é feita aqui e retorna o objeto de conexão 'conn'
        const conn = await mongoose.connect(process.env.MONGODB_URI);

    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error.message);
        throw error;
    }
};

module.exports = connectDB;
