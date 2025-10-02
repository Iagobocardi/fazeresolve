const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiro.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware.js');
const noCache = require('../middlewares/noCache.middleware.js'); // Importa o middleware no-cache
const { multerMemoryUpload, uploadToCloudinary } = require('../middlewares/cloudinary.middleware.js'); // Importa os novos middlewares

// Protege todas as rotas financeiras, permitindo acesso apenas ao Dono da conta.
const needsAuth = [authMiddleware, roleMiddleware(['Dono', 'ADMIN'])];

/**
 * @route GET /api/financeiro/resumo
 * @description Retorna um resumo financeiro (faturamento, despesas, lucro).
 * @access Privado (Dono, ADMIN)
 */
router.get('/resumo', [...needsAuth, noCache], financeiroController.getResumoFinanceiro);

/**
 * @route GET /api/financeiro/historico
 * @description Retorna o histórico de transações paginadas.
 * @access Privado (Dono, ADMIN)
 */
router.get('/historico', needsAuth, financeiroController.getHistoricoTransacoes);

/**
 * @route POST /api/financeiro/transacoes
 * @description Cria uma nova transação manual (receita ou despesa), com suporte para anexo de comprovante.
 * @access Privado (Dono, ADMIN)
 */
router.post(
    '/transacoes', 
    needsAuth, 
    multerMemoryUpload.single('comprovante'), 
    uploadToCloudinary('comprovantes'), 
    financeiroController.createManualTransacao
);

/**
 * @route DELETE /api/financeiro/transacoes/:id
 * @description Deleta uma transação manual.
 * @access Privado (Dono, ADMIN)
 */
router.delete('/transacoes/:id', needsAuth, financeiroController.deleteManualTransacao);

module.exports = router;
