// src/routes/configuracao.routes.js

const express = require('express');
const router = express.Router();
const configuracaoController = require('../controllers/configuracao.controller.js');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const needsAuth = [authMiddleware, roleMiddleware(['Dono', 'ADMIN'])];

// Rota para OBTER a configuração
// GET /api/configuracoes
router.get('/', needsAuth, configuracaoController.getConfiguracao);

// Rota para ATUALIZAR a configuração
// PUT /api/configuracoes
router.put('/', needsAuth, configuracaoController.updateConfiguracao);

// Rota para obter todos os dados da página de configuração de uma vez
router.get('/all-data', needsAuth, configuracaoController.getAllData);

// Rota para ATUALIZAR as informações do perfil da empresa
router.put('/perfil', needsAuth, configuracaoController.updatePerfil);

// Rotas para gerenciar a assinatura
router.post('/assinatura/alterar-plano', needsAuth, configuracaoController.alterarPlano);
router.post('/assinatura/cancelar', needsAuth, configuracaoController.cancelarAssinatura);
router.post('/assinatura/atualizar-pagamento', needsAuth, configuracaoController.atualizarMetodoPagamento);

// Rota para ATUALIZAR as configurações de recebimento
router.put('/recebimentos', needsAuth, configuracaoController.updateRecebimentos);

// --- NOVAS ROTAS PARA A INTEGRAÇÃO ---
router.get('/google/connect', needsAuth, configuracaoController.connectGoogleCalendar);
router.get('/google/callback', configuracaoController.handleGoogleCallback); // Esta rota não deve ter autenticação
router.delete('/google/disconnect', needsAuth, configuracaoController.disconnectGoogleCalendar);

// Rotas para o fluxo de onboarding do WhatsApp
router.post('/whatsapp/iniciar-onboarding', authMiddleware, configuracaoController.iniciarWhatsappOnboarding);
router.post('/whatsapp/verificar-sender', authMiddleware, configuracaoController.verificarWhatsappSender);

// Rota para iniciar a conexão com o Mercado Pago
router.get('/mercadopago/connect', needsAuth, configuracaoController.connectMercadoPago);

// Rota de callback para o Mercado Pago após a autorização do vendedor
router.get('/mercadopago/callback', configuracaoController.handleMercadoPagoCallback);


module.exports = router;
