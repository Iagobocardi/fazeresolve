const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');

// Função para listar todos os clientes e contar os seus pedidos
const getAllClientes = async (req, res) => {
    try {
        const clientesComPedidos = await Cliente.aggregate([
            {
                $lookup: {
                    from: Orcamento.collection.name,
                    localField: '_id',
                    foreignField: 'cliente',
                    as: 'pedidos'
                }
            },
            {
                $project: {
                    nome: 1,
                    telefone: 1,
                    role: 1,
                    createdAt: 1,
                    totalPedidos: { $size: '$pedidos' }
                }
            },
            { $sort: { nome: 1 } }
        ]);
        res.status(200).json(clientesComPedidos);
    } catch (error) {
        console.error("ERRO em getAllClientes:", error);
        res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
};

// Função para buscar um cliente por ID
const buscarClientePorId = async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json(cliente);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cliente.' });
    }
};

// Função para criar um novo cliente (será usada pelo painel no futuro)
const criarCliente = async (req, res) => {
    // NOSSOS DETECTIVES:
    console.log('--- CONTROLLER: A função criarCliente foi chamada. ---');
    console.log('--- DADOS RECEBIDOS DO POSTMAN (req.body): ---');
    console.log(req.body);
    console.log(`--- SENHA RECEBIDA DIRETAMENTE: ${req.body.password} ---`);

    try {
        const novoCliente = new Cliente(req.body);
        
        console.log('--- OBJETO CLIENTE PREPARADO (ANTES DE .save()) ---');
        console.log('A senha neste objeto é:', novoCliente.password);

        const clienteSalvo = await novoCliente.save();

        console.log('--- CLIENTE SALVO NO BANCO DE DADOS (DEPOIS DE .save()) ---');
        console.log(clienteSalvo);
        
        res.status(201).json(clienteSalvo);
        
    } catch (error) {
        console.error('ERRO DETALHADO AO CRIAR CLIENTE:', error); 
        res.status(500).json({ 
            mensagem: 'Ocorreu um erro interno no servidor.',
            erro_detalhado: error,
            stack_trace: error.stack
        });
    }
};

// Função para atualizar um cliente
const atualizarCliente = async (req, res) => {
    try {
        const clienteAtualizado = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!clienteAtualizado) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json(clienteAtualizado);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
};

// Função para deletar um cliente
const deletarCliente = async (req, res) => {
    try {
        const clienteDeletado = await Cliente.findByIdAndDelete(req.params.id);
        if (!clienteDeletado) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        res.status(200).json({ message: 'Cliente deletado com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar cliente.' });
    }
};
const getClienteComPedidos = async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }
        // CORREÇÃO: A busca agora seleciona mais campos para o histórico.
        const pedidos = await Orcamento.find({ cliente: cliente._id })
            .select('shortId descricao status valorProposto tipo data') // Seleciona os campos específicos
            .sort({ data: -1 });
            
        res.status(200).json({ cliente, pedidos });
    } catch (error) {
        console.error("ERRO em getClienteComPedidos:", error);
        res.status(500).json({ error: 'Erro ao buscar detalhes do cliente.' });
    }
};


// CORREÇÃO: Exporta TODAS as funções que as rotas precisam.
module.exports = {
    getAllClientes,
    buscarClientePorId,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    getClienteComPedidos
};