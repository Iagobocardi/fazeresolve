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

// --- Rotas do Catálogo de Mercado (Faz&Resolve) ---

// GET /api/catalogo/mercado?area=:areaDeAtuacao
router.get('/mercado', getItensMercado);

// GET /api/catalogo/mercado/precos-regionais
router.get('/mercado/precos-regionais', getPrecosRegionais);


// --- Rotas do Catálogo Pessoal (do Usuário) ---

// GET /api/catalogo/pessoal
router.get('/pessoal', getItensPessoais);

// POST /api/catalogo/pessoal
router.post('/pessoal', createItemPessoal);

// PUT /api/catalogo/pessoal/:id
router.put('/pessoal/:id', updateItemPessoal);

// DELETE /api/catalogo/pessoal/:id
router.delete('/pessoal/:id', deleteItemPessoal);

module.exports = router;
