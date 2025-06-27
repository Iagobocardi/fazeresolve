// Arquivo: src/controllers/whatsapp.controller.js
const whatsappService = require('../services/whatsapp.service');

const handleWhatsAppWebhook = async (req, res) => {
    // ===============================================================
    // SUPER LOG DE DIAGNÓSTICO - Adicione este bloco
    // ===============================================================
    console.log('--- NOVO WEBHOOK RECEBIDO ---');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Corpo da Requisição (Body):', JSON.stringify(req.body, null, 2));
    console.log('Cabeçalhos (Headers):', JSON.stringify(req.headers, null, 2));
    console.log('---------------------------------');
    // ===============================================================
    if (!req.body || !req.body.From) {
        console.log('[CONTROLLER] Requisição recebida sem um remetente (From). Ignorando.');
        return res.status(200).send('Request ignored: Missing "From" field.');
    }

    // --- PASSO 2: EXTRACÇÃO SEGURA DOS DADOS ---
    // Agora que sabemos que 'From' existe, podemos prosseguir com segurança.
    const senderPhone = req.body.From.replace('whatsapp:', '');
    const senderName = req.body.ProfileName;
    const messageBody = req.body.Body || ''; // Garante que nunca é undefined
    const mediaUrls = [];
    const numMedia = parseInt(req.body.NumMedia || '0');

    if (numMedia > 0) {
        for (let i = 0; i < numMedia; i++) {
            mediaUrls.push(req.body[`MediaUrl${i}`]);
        }
    }
    
    console.log(`[CONTROLLER] Requisição VÁLIDA recebida de ${senderPhone}.`);

    try {
        const senderInfo = {
            phone: senderPhone,
            name: senderName
        };

        await whatsappService.handleIncomingMessage(senderInfo, messageBody, mediaUrls);

        res.status(200).send();
    } catch (error) {
        console.error('[CONTROLLER] ERRO CRÍTICO:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    handleWhatsAppWebhook 
};
