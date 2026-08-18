// src/middlewares/mercadoPago.middleware.js
const crypto = require('crypto');

const validateWebhookSignature = (req, res, next) => {
    try {
        const signatureHeader = req.get('x-signature');
        const requestId = req.get('x-request-id');
        const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

        if (!signatureHeader) {
            return res.status(400).send('Signature header missing.');
        }

        if (!webhookSecret) {
            console.error('[Webhook Security] Validação falhou: MERCADO_PAGO_WEBHOOK_SECRET não está configurado no servidor.');
            return res.status(500).send('Webhook secret not configured on server.');
        }

        const parts = signatureHeader.split(',');
        const timestamp = parts.find(part => part.startsWith('ts=')).split('=')[1];
        const receivedHash = parts.find(part => part.startsWith('v1=')).split('=')[1];
        
        // CORREÇÃO: O manifesto deve incluir o request-id, se ele existir.
        const id = req.body.data.id;
        let manifest = `id:${id};ts:${timestamp};`;
        if (requestId) {
            manifest = `id:${id};request-id:${requestId};ts:${timestamp};`;
        }

        const hmac = crypto.createHmac('sha256', webhookSecret);
        hmac.update(manifest);
        const computedHash = hmac.digest('hex');

        if (crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(receivedHash, 'hex'))) {
            console.log('[Webhook Security] Assinatura do Webhook validada com sucesso.');
            return next();
        } else {
            console.warn(`[Webhook Security] Assinatura inválida. Manifest: "${manifest}". Hash Recebido: ${receivedHash}. Hash Calculado: ${computedHash}`);
            return res.status(403).send('Invalid signature.');
        }
    } catch (error) {
        console.error('[Webhook Security] Erro inesperado ao validar a assinatura:', error);
        return res.status(400).send('Error processing webhook signature.');
    }
};

module.exports = {
    validateWebhookSignature,
};
