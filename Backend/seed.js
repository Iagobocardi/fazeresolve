// seed.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Usuario = require('./src/models/usuario.model');
const Cliente = require('./src/models/cliente.model');
const Orcamento = require('./src/models/orcamento.model');
const WhatsappTemplate = require('./src/models/whatsappTemplate.model');

dotenv.config();

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conectado ao MongoDB para seeding...');

        // Limpar dados existentes
        await Usuario.deleteMany({});
        await Cliente.deleteMany({});
        await Orcamento.deleteMany({});
        await WhatsappTemplate.deleteMany({});
        console.log('Dados antigos limpos.');

        // Criar Utilizadores
        const adminUser = await Usuario.create({
            nome: 'Admin User',
            email: 'admin@example.com',
            password: 'password123',
            plano: 'Admin',
        });

        const premiumUser = await Usuario.create({
            nome: 'Premium User',
            email: 'premium@example.com',
            password: 'password123',
            plano: 'Premium',
        });

        const essencialUser = await Usuario.create({
            nome: 'Essencial User',
            email: 'essencial@example.com',
            password: 'password123',
            plano: 'Essencial',
        });
        console.log('Utilizadores criados.');

        // Criar Cliente
        const cliente = await Cliente.create({
            nome: 'Cliente Teste',
            telefone: '5511987654321',
            email: 'cliente@teste.com',
        });
        console.log('Cliente criado.');

        // Criar Orçamento
        const orcamento = await Orcamento.create({
            cliente: cliente._id,
            descricao: 'Reparo de vazamento na cozinha',
            valorProposto: 150.75,
            status: 'Pendente',
            dataAgendamento: new Date('2024-10-20T14:00:00Z'),
            shortId: '12345'
        });
        console.log('Orçamento criado.');

        // Criar Template
        const template = await WhatsappTemplate.create({
            titulo: 'Confirmação de Orçamento',
            categoria: 'Orçamento',
            mensagem: 'Olá {{cliente.nome}}, seu orçamento para "{{orcamento.descricao}}" no valor de R$ {{orcamento.valorProposto}} foi recebido. O ID do seu pedido é {{orcamento.shortId}}.',
        });
        console.log('Template criado.');

        console.log('Seeding concluído com sucesso!');

    } catch (error) {
        console.error('Erro durante o seeding:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Desconectado do MongoDB.');
    }
};

seedDatabase();
