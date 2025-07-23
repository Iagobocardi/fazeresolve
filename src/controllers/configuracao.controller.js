// src/controllers/configuracao.controller.js

const Configuracao = require('../models/configuracao.model.js');

// Função para obter a configuração atual (ou criar uma se não existir)
exports.getConfiguracao = async (req, res) => {
    try {
        const config = await Configuracao.obterConfiguracao();
        res.status(200).json(config);
    } catch (error) {
        console.error("Erro ao obter a configuração:", error);
        res.status(500).json({ message: "Ocorreu um erro ao buscar as configurações." });
    }
};

// Função para atualizar a configuração
exports.updateConfiguracao = async (req, res) => {
    try {
        // Usamos findOneAndUpdate com a opção { new: true, upsert: true }
        // `upsert: true` garante que se não houver um documento de configuração, ele será criado.
        // `new: true` garante que a resposta devolva o documento atualizado.
        const configAtualizada = await Configuracao.findOneAndUpdate({}, req.body, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        res.status(200).json(configAtualizada);
    } catch (error) {
        console.error("Erro ao atualizar a configuração:", error);
        res.status(500).json({ message: "Ocorreu um erro ao guardar as configurações." });
    }
};