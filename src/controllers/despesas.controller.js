// Arquivo: src/controllers/despesas.controller.js

const Despesa = require('../models/despesa.model');

// Criar uma nova despesa
const createDespesa = async (req, res) => {
    try {
        const novaDespesa = new Despesa(req.body);
        await novaDespesa.save();
        res.status(201).json({ message: "Despesa criada com sucesso!", despesa: novaDespesa });
    } catch (error) {
        res.status(400).json({ message: "Erro ao criar despesa.", error: error.message });
    }
};

// Obter todas as despesas
const getAllDespesas = async (req, res) => {
    try {
        const despesas = await Despesa.find().sort({ data: -1 }); // Ordena da mais recente para a mais antiga
        res.status(200).json(despesas);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar despesas.", error: error.message });
    }
};

// Obter uma despesa por ID
const getDespesaById = async (req, res) => {
    try {
        const despesa = await Despesa.findById(req.params.id);
        if (!despesa) {
            return res.status(404).json({ message: "Despesa não encontrada." });
        }
        res.status(200).json(despesa);
    } catch (error) {
        res.status(500).json({ message: "Erro ao buscar despesa.", error: error.message });
    }
};

// Atualizar uma despesa
const updateDespesa = async (req, res) => {
    try {
        const despesa = await Despesa.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!despesa) {
            return res.status(404).json({ message: "Despesa não encontrada." });
        }
        res.status(200).json({ message: "Despesa atualizada com sucesso!", despesa });
    } catch (error) {
        res.status(400).json({ message: "Erro ao atualizar despesa.", error: error.message });
    }
};

// Deletar uma despesa
const deleteDespesa = async (req, res) => {
    try {
        const despesa = await Despesa.findByIdAndDelete(req.params.id);
        if (!despesa) {
            return res.status(404).json({ message: "Despesa não encontrada." });
        }
        res.status(200).json({ message: "Despesa deletada com sucesso." });
    } catch (error) {
        res.status(500).json({ message: "Erro ao deletar despesa.", error: error.message });
    }
};

module.exports = {
    createDespesa,
    getAllDespesas,
    getDespesaById,
    updateDespesa,
    deleteDespesa
};