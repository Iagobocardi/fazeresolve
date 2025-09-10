// Arquivo: src/controllers/produtos.controller.js

const Produto = require('../models/produto.model');
const MovimentoEstoque = require('../models/movimentoEstoque.model');

// Criar um novo produto
const createProduto = async (req, res) => {
    try {
        // Corrigido para aceitar 'quantidade' do frontend e mapear para 'quantidadeEmEstoque'
        const { nome, descricao, unidade, quantidade, custoUnitario, fornecedor, estoqueMinimo } = req.body;
        
        // Adiciona tratamento robusto para o custoUnitario
        let custoNumerico = 0;
        if (custoUnitario) {
            const custoLimpo = String(custoUnitario).replace(/[^0-9,.-]/g, '').replace(',', '.');
            custoNumerico = parseFloat(custoLimpo);
            if (isNaN(custoNumerico)) {
                custoNumerico = 0;
            }
        }

        // Cria o produto
        const novoProduto = new Produto({ 
            nome, 
            descricao, 
            unidade, 
            quantidadeEmEstoque: quantidade, // Mapeamento correto
            custoUnitario: custoNumerico, // Usa o valor limpo e parseado
            fornecedor, 
            estoqueMinimo 
        });

        // Verifica o alerta de estoque no momento da criação
        if (novoProduto.quantidadeEmEstoque <= novoProduto.estoqueMinimo) {
            novoProduto.alertaEstoqueBaixo = true;
        }

        await novoProduto.save();

        // Se uma quantidade inicial for informada, regista o primeiro movimento de estoque
        if (quantidade && quantidade > 0) {
            const movimento = new MovimentoEstoque({
                produto: novoProduto._id,
                tipo: 'Entrada',
                quantidade: quantidade, // Usa a 'quantidade' recebida
                motivo: 'Estoque inicial'
            });
            await movimento.save();
        }

        res.status(201).json({ message: "Produto criado com sucesso!", produto: novoProduto });
    } catch (error) {
        // Código 400 indica um erro do lado do cliente (ex: dados duplicados ou faltando)
        res.status(400).json({ message: "Erro ao criar produto.", error: error.message });
    }
};

// Obter todos os produtos
const getAllProdutos = async (req, res) => {
    try {
        const produtos = await Produto.find().sort({ nome: 1 }); // Ordena por nome
        res.status(200).json(produtos);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar produtos.", error: error.message });
    }
};

// Atualizar os detalhes de um produto (NÃO o estoque)
const updateProduto = async (req, res) => {
    try {
        // Remove campos que não devem ser atualizados diretamente por esta rota
        const { quantidadeEmEstoque, alertaEstoqueBaixo, ...updateData } = req.body;

        const produto = await Produto.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!produto) {
            return res.status(404).json({ message: "Produto não encontrado." });
        }
        res.status(200).json({ message: "Produto atualizado com sucesso!", produto });
    } catch (error) {
        res.status(400).json({ message: "Erro ao atualizar produto.", error: error.message });
    }
};

// Deletar um produto
const deleteProduto = async (req, res) => {
    try {
        const produto = await Produto.findByIdAndDelete(req.params.id);
        if (!produto) {
            return res.status(404).json({ message: "Produto não encontrado." });
        }
        // O ideal seria também apagar os movimentos de estoque associados, mas por simplicidade vamos deixar assim por agora.
        res.status(200).json({ message: "Produto deletado com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao deletar produto.", error: error.message });
    }
};

// Função específica para ajustar o estoque (adicionar ou remover)
const ajustarEstoque = async (req, res) => {
    try {
        const { quantidade, motivo, tipo } = req.body; // tipo pode ser 'Entrada' ou 'Saída'

        if (!quantidade || !motivo || !tipo) {
            return res.status(400).json({ message: "Quantidade, motivo e tipo são obrigatórios."});
        }

        const produto = await Produto.findById(req.params.id);
        if (!produto) {
            return res.status(404).json({ message: "Produto não encontrado." });
        }
        
        const quantidadeNumerica = Number(quantidade);

        // Atualiza a quantidade no documento do produto
        if (tipo === 'Entrada') {
            produto.quantidadeEmEstoque += quantidadeNumerica;
        } else if (tipo === 'Saída') {
            if (produto.quantidadeEmEstoque < quantidadeNumerica) {
                return res.status(400).json({ message: "Estoque insuficiente para esta saída."});
            }
            produto.quantidadeEmEstoque -= quantidadeNumerica;
        } else {
            return res.status(400).json({ message: "Tipo de movimento inválido. Use 'Entrada' ou 'Saída'."});
        }

        // Verifica e atualiza o status do alerta de estoque baixo
        if (produto.quantidadeEmEstoque <= produto.estoqueMinimo) {
            produto.alertaEstoqueBaixo = true;
        } else {
            produto.alertaEstoqueBaixo = false;
        }
        
        await produto.save();

        // Cria o registo do movimento
        const movimento = new MovimentoEstoque({ produto: produto._id, tipo, quantidade: quantidadeNumerica, motivo });
        await movimento.save();

        res.status(200).json({ message: "Estoque atualizado com sucesso!", produto });
    } catch (error) {
        res.status(500).json({ message: "Erro ao ajustar estoque.", error: error.message });
    }
};


module.exports = {
    createProduto,
    getAllProdutos,
    updateProduto,
    deleteProduto,
    ajustarEstoque
};
