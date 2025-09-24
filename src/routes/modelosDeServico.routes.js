const express = require('express');
const router = express.Router();
const {
    getModelos,
    getModeloById,
    createModelo,
    updateModelo,
    deleteModelo
} = require('../controllers/modelosDeServico.controller');

// GET /api/modelos
router.get('/', getModelos);

// GET /api/modelos/:id
router.get('/:id', getModeloById);

// POST /api/modelos
router.post('/', createModelo);

// PUT /api/modelos/:id
router.put('/:id', updateModelo);

// DELETE /api/modelos/:id
router.delete('/:id', deleteModelo);

module.exports = router;
