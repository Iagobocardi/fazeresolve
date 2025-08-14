// Em: createAdmin.js

require('dotenv').config(); 
const mongoose = require('mongoose');
const Cliente = require('./src/models/cliente.model.js');
// Importa a função de conexão partilhada
const connectDB = require('./src/config/database.js');

// --- PREENCHA OS SEUS DADOS AQUI ---
const adminData = {
    nome: "Administrador",
    email: "iago.bocardi@fazeresolve.com",
    password: "Senha44169556_@",
    telefone: "+5515998595422",
    role: 'ADMIN',
    plano: 'Premium'
};
// ------------------------------------

const createAdminUser = async () => {
    try {
        console.log('A ligar à base de dados usando a função partilhada...');
        // Usa a função de conexão partilhada
        await connectDB();
        console.log('Ligado com sucesso!');

        console.log('A verificar se o utilizador já existe...');
        const existingAdmin = await Cliente.findOne({ email: adminData.email });
        
        if (existingAdmin) {
            console.log('O utilizador administrador com este email já existe.');
            return;
        }

        console.log('A criar o novo utilizador administrador...');
        const novoAdmin = new Cliente(adminData);
        await novoAdmin.save();

        console.log('✅ Utilizador Administrador criado com sucesso!');
        console.log(`   -> Email: ${adminData.email}`);
        console.log(`   -> Senha (PARA DEPURAÇÃO): ${adminData.password}`);

    } catch (error) {
        console.error('❌ Ocorreu um erro:', error);
    } finally {
        // Fecha a ligação à base de dados para o script terminar
        await mongoose.connection.close();
        console.log('Ligação à base de dados fechada.');
    }
};

// Executa a função
createAdminUser();