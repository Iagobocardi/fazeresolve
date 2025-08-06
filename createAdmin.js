// Em: createAdmin.js

// Carrega as variáveis de ambiente (como a sua string de conexão do MongoDB)
require('dotenv').config(); 
const mongoose = require('mongoose');
const Cliente = require('./src/models/cliente.model.js'); // Importa o seu modelo de cliente

// --- PREENCHA OS SEUS DADOS AQUI ---
const adminData = {
    nome: "Administrador", // O seu nome
    email: "iago.bocardi@fazeresolve.com", // O seu email de login
    password: "Senha44169556_@", // Escolha uma senha forte
    telefone: "+5515998595422", // O seu telefone
    role: 'PRESTADOR', // Define esta conta como administrador
    plano: 'Premium' // Define o seu plano inicial
};
// ------------------------------------

const createAdminUser = async () => {
    try {
        console.log('A ligar à base de dados...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Ligado com sucesso!');

        console.log('A verificar se o utilizador já existe...');
        const existingAdmin = await Cliente.findOne({ email: adminData.email });
        
        if (existingAdmin) {
            console.log('O utilizador administrador com este email já existe.');
            return;
        }

        console.log('A criar o novo utilizador administrador...');
        const novoAdmin = new Cliente(adminData);
        await novoAdmin.save(); // O hook 'pre-save' no seu modelo irá encriptar a senha automaticamente

        console.log('✅ Utilizador Administrador criado com sucesso!');
        console.log(`   -> Email: ${adminData.email}`);
        console.log(`   -> Senha: (a que você definiu no script)`);

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