const express = require('express');
const router = express.Router();
const {
    getModelos,
    getModeloById,
    createModelo,
    updateModelo,
    deleteModelo
} = require('../controllers/modelosDeServico.controller');
const checkPermission = require('../middlewares/checkPermission.middleware');

const hasPermission = checkPermission('gerenciar_modelos_servico');

// GET /api/modelos
router.get('/', hasPermission, getModelos);

// GET /api/modelos/:id
router.get('/:id', hasPermission, getModeloById);

// POST /api/modelos
router.post('/', hasPermission, createModelo);

// PUT /api/modelos/:id
router.put('/:id', hasPermission, updateModelo);

// DELETE /api/modelos/:id
router.delete('/:id', hasPermission, deleteModelo);

module.exports = router;
