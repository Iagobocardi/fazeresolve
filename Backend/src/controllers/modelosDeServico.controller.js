const ModeloDeServico = require('../models/modeloDeServico.model');

// @desc    Buscar todos os modelos de serviço do usuário
// @route   GET /api/modelos
// @access  Privado
exports.getModelos = async (req, res, next) => {
    try {
        const modelos = await ModeloDeServico.find({ userId: req.user._id });
        res.status(200).json({
            success: true,
            count: modelos.length,
            data: modelos
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Buscar um modelo de serviço por ID
// @route   GET /api/modelos/:id
// @access  Privado
exports.getModeloById = async (req, res, next) => {
    try {
        const modelo = await ModeloDeServico.findOne({ _id: req.params.id, userId: req.user._id });

        if (!modelo) {
            return res.status(404).json({ success: false, message: 'Modelo de serviço não encontrado.' });
        }

        res.status(200).json({
            success: true,
            data: modelo
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Criar um novo modelo de serviço
// @route   POST /api/modelos
// @access  Privado
exports.createModelo = async (req, res, next) => {
    try {
        const modeloData = { ...req.body, userId: req.user._id };
        const novoModelo = await ModeloDeServico.create(modeloData);
        res.status(201).json({
            success: true,
            data: novoModelo
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Atualizar um modelo de serviço
// @route   PUT /api/modelos/:id
// @access  Privado
exports.updateModelo = async (req, res, next) => {
    try {
        let modelo = await ModeloDeServico.findById(req.params.id);

        if (!modelo) {
            return res.status(404).json({ success: false, message: 'Modelo de serviço não encontrado.' });
        }

        if (modelo.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Não autorizado a atualizar este modelo.' });
        }

        modelo = await ModeloDeServico.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: modelo
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Deletar um modelo de serviço
// @route   DELETE /api/modelos/:id
// @access  Privado
exports.deleteModelo = async (req, res, next) => {
    try {
        const modelo = await ModeloDeServico.findById(req.params.id);

        if (!modelo) {
            return res.status(404).json({ success: false, message: 'Modelo de serviço não encontrado.' });
        }

        if (modelo.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Não autorizado a deletar este modelo.' });
        }

        await modelo.remove();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        next(error);
    }
};
