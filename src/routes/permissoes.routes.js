const express = require('express');
const router = express.Router();
const permissoesController = require('../controllers/permissoes.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

// Todas as rotas neste arquivo exigem autenticação.
router.use(authMiddleware);

/**
 * @route   GET /api/permissoes/disponiveis
 * @desc    Retorna todas as permissões disponíveis no sistema
 * @access  Private (Qualquer usuário autenticado)
 */
router.get('/disponiveis', permissoesController.getAvailablePermissions);


/**
 * @route   PUT /api/permissoes/membros/:id/permissions
 * @desc    Atualiza as permissões de um membro da equipe
 * @access  Private (Apenas Dono da conta)
 */
router.put(
    '/membros/:id/permissions',
    roleMiddleware(['Dono']), // Apenas o Dono da conta pode editar permissões
    permissoesController.updatePermissoes
);

module.exports = router;
