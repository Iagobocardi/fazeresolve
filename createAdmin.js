// Em: createAdmin.js

require('dotenv').config();
const mongoose = require('mongoose');
const Cliente = require('./src/models/cliente.model.js');
const connectDB = require('./src/config/database.js');

// --- Lendo dados da linha de comando ---
// process.argv = [ 'node', 'createAdmin.js', 'nome', 'email', 'senha', 'telefone' ]
const args = process.argv.slice(2); // Ignora 'node' e o nome do arquivo

if (args.length < 4) {
    console.log('❌ Uso incorreto. Forneça todos os argumentos na ordem:');
    console.log('   node createAdmin.js "Seu Nome" "seu@email.com" "sua-senha" "seu-telefone"');
    process.exit(1); // Encerra o script com um código de erro
}

const adminData = {
    nome: args[0],
    email: args[1],
    password: args[2],
    telefone: args[3],
    role: 'ADMIN',
    status: 'ATIVO' // Um admin já deve ser criado como ativo
};
// ------------------------------------

const createAdminUser = async () => {
    try {
        console.log('A ligar à base de dados...');
        await connectDB();
        console.log('Ligado com sucesso!');

        console.log(`A verificar se o utilizador com email ${adminData.email} já existe...`);
        const existingAdmin = await Cliente.findOne({ email: adminData.email });
        
        if (existingAdmin) {
            console.log('O utilizador administrador com este email já existe.');
            return;
        }

        console.log('A criar o novo utilizador administrador...');
        const novoAdmin = new Cliente(adminData);
        await novoAdmin.save();

        console.log('✅ Utilizador Administrador criado com sucesso!');
        console.log(`   -> Nome: ${adminData.nome}`);
        console.log(`   -> Email: ${adminData.email}`);

    } catch (error) {
        console.error('❌ Ocorreu um erro:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Ligação à base de dados fechada.');
    }
};

createAdminUser();
