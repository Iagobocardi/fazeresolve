const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const roleMiddleware = require('../middlewares/role.middleware.js');

// Rota PÚBLICA para o callback do Mercado Pago OAuth
router.get('/mercadopago-callback', providerController.handleMercadoPagoCallback);

// Todas as rotas abaixo exigem que o usuário seja o Dono da conta
router.use(authMiddleware);
router.use(roleMiddleware(['Dono']));

// Rota para buscar as configurações de pagamento do prestador
router.get('/payment-settings', providerController.getPaymentSettings);

// Rota para atualizar as configurações de pagamento (método manual/pix)
router.put('/payment-settings', providerController.updatePaymentSettings);

// Rota para iniciar o fluxo de conexão com o Mercado Pago
router.post('/connect-mercadopago', providerController.connectMercadoPago);

// Rota para atualizar as informações da empresa para NFe
router.put('/company-info', providerController.updateCompanyInfo);

// Rota para buscar os dados do "dashboard" do prestador (dados do usuário/conta)
router.get('/dashboard', providerController.getProviderDashboard);

// Rota para buscar os detalhes da conta para a página de gestão
router.get('/account-details', providerController.getAccountDetails);


module.exports = router;
