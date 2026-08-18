require('dotenv').config();

const mongoose = require('mongoose');
const Conta = require('../src/models/conta.model');
const Usuario = require('../src/models/usuario.model');
const Cliente = require('../src/models/cliente.model');
const Orcamento = require('../src/models/orcamento.model');
const Transacao = require('../src/models/transacao.model');
const Servico = require('../src/models/servico.model');

const DEMO_EMAIL = 'demo@fazeresolve.local';
const DEMO_PASSWORD = 'FazResolve123!';

const daysFromNow = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
};

async function seedDemoData() {
    const conta = await Conta.findOneAndUpdate(
        { nome: 'Faz & Resolve Demonstração' },
        {
            $set: {
                plano: 'Premium',
                statusAssinatura: 'ATIVO',
                paymentType: 'subscription',
                planId: 'premium_mensal',
                chavePixManual: 'demo@fazeresolve.local'
            }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    let usuario = await Usuario.findOne({ email: DEMO_EMAIL }).select('+password');
    if (!usuario) {
        usuario = await Usuario.create({
            nome: 'Usuário Demonstração',
            email: DEMO_EMAIL,
            telefone: '11999990000',
            password: DEMO_PASSWORD,
            contaId: conta._id,
            role: 'Dono',
            plano: 'Premium'
        });
    } else {
        usuario.contaId = conta._id;
        usuario.role = 'Dono';
        usuario.plano = 'Premium';
        await usuario.save();
    }

    const [ana, bruno, carla] = await Promise.all([
        Cliente.findOneAndUpdate(
            { contaId: conta._id, telefone: '11988881111' },
            { $set: { nome: 'Ana Martins', email: 'ana@example.com', endereco: { cidade: 'São Paulo', estado: 'SP', bairro: 'Vila Mariana', cep: '04101-300' } } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ),
        Cliente.findOneAndUpdate(
            { contaId: conta._id, telefone: '11977772222' },
            { $set: { nome: 'Bruno Almeida', email: 'bruno@example.com', endereco: { cidade: 'São Paulo', estado: 'SP', bairro: 'Moema', cep: '04090-000' } } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ),
        Cliente.findOneAndUpdate(
            { contaId: conta._id, telefone: '11966663333' },
            { $set: { nome: 'Carla Souza', email: 'carla@example.com', endereco: { cidade: 'São Paulo', estado: 'SP', bairro: 'Pinheiros', cep: '05422-011' } } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        )
    ]);

    const pedidos = [
        { shortId: 'DEMO01', cliente: ana._id, descricao: 'Reparo hidráulico residencial', categoria: 'Hidráulica', valorProposto: 480, status: 'Pendente', statusPagamento: 'Pendente', data: daysFromNow(-5), dataVencimento: daysFromNow(-1) },
        { shortId: 'DEMO02', cliente: bruno._id, descricao: 'Instalação de luminárias', categoria: 'Elétrica', valorProposto: 760, status: 'Aceito', statusPagamento: 'Pago Parcial', data: daysFromNow(-3), pagamentos: [{ valor: 300, metodo: 'Pix', data: daysFromNow(-2) }] },
        { shortId: 'DEMO03', cliente: carla._id, descricao: 'Manutenção preventiva', categoria: 'Manutenção', valorProposto: 950, status: 'Agendado', statusPagamento: 'Pendente', data: daysFromNow(-1), dataAgendamento: daysFromNow(2) },
        { shortId: 'DEMO04', cliente: ana._id, descricao: 'Revisão de instalação elétrica', categoria: 'Elétrica', valorProposto: 1200, status: 'Finalizado', statusPagamento: 'Pago', data: daysFromNow(-12), dataFinalizacao: daysFromNow(-3), pagamentos: [{ valor: 1200, metodo: 'Cartão de Crédito', data: daysFromNow(-3) }] }
    ];

    await Promise.all(pedidos.map((pedido) => Orcamento.findOneAndUpdate(
        { contaId: conta._id, shortId: pedido.shortId },
        { $set: { ...pedido, contaId: conta._id } },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    )));

    const transacoes = [
        { descricao: 'Serviço de instalação elétrica', tipo: 'Receita', valor: 1200, categoria: 'Elétrica', data: daysFromNow(-3) },
        { descricao: 'Sinal de serviço', tipo: 'Receita', valor: 300, categoria: 'Hidráulica', data: daysFromNow(-2) },
        { descricao: 'Compra de materiais', tipo: 'Despesa', valor: 280, categoria: 'Materiais', data: daysFromNow(-3) },
        { descricao: 'Deslocamento', tipo: 'Despesa', valor: 90, categoria: 'Operacional', data: daysFromNow(-1) }
    ];
    await Promise.all(transacoes.map((transacao) => Transacao.findOneAndUpdate(
        { contaId: conta._id, descricao: transacao.descricao },
        { $set: { ...transacao, contaId: conta._id } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    )));

    await Servico.findOneAndUpdate(
        { contaId: conta._id, tipoServico: 'Instalação elétrica' },
        { $set: { contaId: conta._id, cliente: ana._id, categoria: 'Elétrica', status: 'Concluído', valorServico: 1200, dataConclusao: daysFromNow(-3) } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    console.log(`Dados de demonstração disponíveis. Login: ${DEMO_EMAIL} | Senha: ${DEMO_PASSWORD}`);
}

if (require.main === module) {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI não foi definido.');
    }
    mongoose.connect(process.env.MONGODB_URI)
        .then(seedDemoData)
        .then(() => mongoose.disconnect())
        .catch(async (error) => {
            console.error('Não foi possível criar os dados de demonstração:', error);
            await mongoose.disconnect();
            process.exitCode = 1;
        });
}

module.exports = { seedDemoData, DEMO_EMAIL, DEMO_PASSWORD };
