// Script para criar uma conta de teste com plano Premium
require('dotenv').config();
const mongoose = require('mongoose');
const Conta = require('./src/models/conta.model');
const Usuario = require('./src/models/usuario.model');

// --- DADOS CONFIGURÁVEIS ---
const DADOS_CONTA = {
    nome: 'Empresa de Teste Premium',
    plano: 'Premium',
    statusAssinatura: 'ATIVO',
};

const DADOS_USUARIO = {
    nome: 'Usuário Teste Premium',
    email: 'premium@test.com',
    password: 'password123',
    role: 'Dono',
};
// -------------------------

const createTestAccount = async () => {
    try {
        // 1. Conectar ao Banco de Dados
        console.log('Conectando ao banco de dados...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conexão com o banco de dados estabelecida.');

        // 2. Verificar se o usuário já existe
        const existingUser = await Usuario.findOne({ email: DADOS_USUARIO.email });
        if (existingUser) {
            console.warn(`AVISO: O usuário com o e-mail "${DADOS_USUARIO.email}" já existe.`);
            const existingConta = await Conta.findById(existingUser.contaId);
            console.log('--- Dados da Conta Existente ---');
            console.log(`Nome da Empresa: ${existingConta.nome}`);
            console.log(`Plano: ${existingConta.plano}`);
            console.log(`Status da Assinatura: ${existingConta.statusAssinatura}`);
            console.log('---------------------------------');
            console.log('Nenhuma nova conta foi criada.');
            return;
        }

        // 3. Criar a nova Conta
        console.log('Criando nova conta Premium...');
        const novaConta = new Conta(DADOS_CONTA);
        await novaConta.save();
        console.log(`Conta "${novaConta.nome}" criada com sucesso. ID: ${novaConta._id}`);

        // 4. Criar o novo Usuário
        console.log('Criando novo usuário Dono...');
        const novoUsuario = new Usuario({
            ...DADOS_USUARIO,
            contaId: novaConta._id,
        });
        await novoUsuario.save();
        console.log(`Usuário "${novoUsuario.nome}" criado com sucesso.`);

        // 5. Exibir informações de sucesso
        console.log('\n✅ Conta de teste Premium criada com sucesso!');
        console.log('-------------------------------------------');
        console.log('Use as seguintes credenciais para fazer login:');
        console.log(`   E-mail: ${DADOS_USUARIO.email}`);
        console.log(`   Senha: ${DADOS_USUARIO.password}`);
        console.log('-------------------------------------------');

    } catch (error) {
        console.error('❌ ERRO AO CRIAR CONTA DE TESTE:', error);
    } finally {
        // 6. Fechar a conexão com o banco de dados
        await mongoose.disconnect();
        console.log('Conexão com o banco de dados fechada.');
    }
};

createTestAccount();
