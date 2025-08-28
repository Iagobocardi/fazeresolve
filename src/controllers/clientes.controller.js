const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const crypto = require('crypto');
const whatsappService = require('../services/whatsapp.service');
const mongoose = require('mongoose');

// Função para listar todos os clientes de um prestador específico
const getAllClientes = async (req, res) => {
    try {
        const prestadorId = new mongoose.Types.ObjectId(req.user.id);

        const clientesDoPrestador = await Orcamento.aggregate([
            // 1. Encontrar todos os orçamentos que pertencem ao prestador logado
            {
                $match: { prestadorId: prestadorId }
            },
            // 2. Agrupar por cliente para obter uma lista de clientes únicos
            {
                $group: {
                    _id: '$cliente',
                    // Opcional: pode-se coletar mais dados aqui se necessário
                }
            },
            // 3. Juntar com a coleção de clientes para obter os seus detalhes
            {
                $lookup: {
                    from: 'clientes', // nome da collection de clientes
                    localField: '_id',
                    foreignField: '_id',
                    as: 'clienteInfo'
                }
            },
            // 4. Desconstruir o array clienteInfo
            {
                $unwind: '$clienteInfo'
            },
            // 5. Juntar novamente com os orçamentos para calcular os totais, mas agora apenas para os clientes deste prestador
            {
                $lookup: {
                    from: 'orcamentos',
                    localField: 'clienteInfo._id',
                    foreignField: 'cliente',
                    as: 'pedidos'
                }
            },
            // 6. Calcular os totais para cada cliente
            {
                $addFields: {
                    totalPedidos: { $size: '$pedidos' },
                    valorTotalGasto: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$pedidos',
                                        as: 'pedido',
                                        cond: { $eq: ['$$pedido.status', 'Finalizado'] }
                                    }
                                },
                                as: 'pedidoFinalizado',
                                in: '$$pedidoFinalizado.valorProposto'
                            }
                        }
                    }
                }
            },
            // 7. Formatar a saída final
            {
                $project: {
                    _id: '$clienteInfo._id',
                    nome: '$clienteInfo.nome',
                    telefone: '$clienteInfo.telefone',
                    totalPedidos: 1,
                    valorTotalGasto: 1
                }
            },
            // 8. Ordenar
            {
                $sort: {
                    valorTotalGasto: -1
                }
            }
        ]);

        res.status(200).json(clientesDoPrestador);
    } catch (error) {
        console.error("Erro ao buscar clientes do prestador:", error);
        res.status(500).json({ message: "Erro ao buscar dados dos clientes." });
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
const enviarConvitePortal = async (req, res) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }

        // 1. Gera um token seguro e aleatório
        const token = crypto.randomBytes(32).toString('hex');

        // 2. Define o token e a data de expiração (ex: 1 hora a partir de agora)
        cliente.activationToken = token;
        cliente.activationTokenExpires = Date.now() + 3600000; // 1 hora em milissegundos

        await cliente.save();

        // 3. Monta a URL de ativação (aponte para o seu frontend)
        // ATENÇÃO: Altere 'http://localhost:3001' para o endereço real do seu frontend no futuro
        const activationUrl = `http://localhost:3001/ativar-conta/${token}`;

        // 4. Envia a mensagem via WhatsApp
        const mensagem = `Olá, ${cliente.nome}! Para aceder ao nosso portal de cliente e acompanhar os seus serviços, por favor, ative a sua conta no seguinte link: ${activationUrl}`;
        await whatsappService.sendWhatsAppMessage(cliente.telefone, mensagem);

        res.status(200).json({ message: 'Convite enviado com sucesso!' });

    } catch (error) {
        console.error("ERRO em enviarConvitePortal:", error);
        res.status(500).json({ message: 'Erro ao enviar o convite.' });
    }
};



// CORREÇÃO: Exporta TODAS as funções que as rotas precisam.
module.exports = {
    getAllClientes,
    buscarClientePorId,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    getClienteComPedidos,
    enviarConvitePortal
};
