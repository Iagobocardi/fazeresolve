// src/middlewares/mercadoPago.middleware.js
const crypto = require('crypto');

const validateWebhookSignature = (req, res, next) => {
    try {
        const signatureHeader = req.get('x-signature');
        const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

        if (!signatureHeader) {
            console.warn('[Webhook Security] Requisição de Webhook bloqueada: cabeçalho x-signature ausente.');
            return res.status(400).send('Signature header missing.');
        }

        if (!webhookSecret) {
            console.error('[Webhook Security] Validação falhou: MERCADO_PAGO_WEBHOOK_SECRET não está configurado no servidor.');
            // Retorna 500 porque é um erro de configuração do nosso lado.
            return res.status(500).send('Webhook secret not configured on server.');
        }

        const parts = signatureHeader.split(',');
        const timestamp = parts.find(part => part.startsWith('ts=')).split('=')[1];
        const receivedHash = parts.find(part => part.startsWith('v1=')).split('=')[1];

        // O template para criar a assinatura
        const manifest = `id:${req.body.data.id};ts:${timestamp};`;

        // Cria o HMAC usando a chave secreta
        const hmac = crypto.createHmac('sha256', webhookSecret);
        hmac.update(manifest);
        const computedHash = hmac.digest('hex');

        // Compara as assinaturas de forma segura para previnir ataques de tempo
        if (crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(receivedHash, 'hex'))) {
            console.log('[Webhook Security] Assinatura do Webhook validada com sucesso.');
            return next(); // Assinatura válida, prossegue para o controller
        } else {
            console.warn('[Webhook Security] Assinatura do Webhook inválida. Acesso negado.');
            return res.status(403).send('Invalid signature.'); // 403 Forbidden é mais apropriado
        }
    } catch (error) {
        console.error('[Webhook Security] Erro inesperado ao validar a assinatura:', error);
        return res.status(400).send('Error processing webhook signature.');
    }
};

module.exports = {
    validateWebhookSignature,
};
