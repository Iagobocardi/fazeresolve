const express = require('express');
const router = express.Router();
const {
    getItensMercado,
    getPrecosRegionais,
    getItensPessoais,
    createItemPessoal,
    updateItemPessoal,
    deleteItemPessoal
} = require('../controllers/catalogo.controller');
const checkPermission = require('../middlewares/checkPermission.middleware');

// --- Rotas do Catálogo de Mercado (Faz&Resolve) ---

// GET /api/catalogo/mercado?area=:areaDeAtuacao
router.get('/mercado', checkPermission('usar_catalogo_inteligente'), getItensMercado);

// GET /api/catalogo/mercado/precos-regionais
router.get('/mercado/precos-regionais', getPrecosRegionais);


const hasPermission = checkPermission('usar_catalogo_inteligente');

// --- Rotas do Catálogo Pessoal (do Usuário) ---

// GET /api/catalogo/pessoal
router.get('/pessoal', hasPermission, getItensPessoais);

// POST /api/catalogo/pessoal
router.post('/pessoal', hasPermission, createItemPessoal);

// PUT /api/catalogo/pessoal/:id
router.put('/pessoal/:id', hasPermission, updateItemPessoal);

// DELETE /api/catalogo/pessoal/:id
router.delete('/pessoal/:id', hasPermission, deleteItemPessoal);

module.exports = router;
