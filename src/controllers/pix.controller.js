const subscriptionService = require('../services/subscription.service.js');

exports.createPixCharge = async (req, res) => {
    try {
        res.status(200).json({ message: 'Pix charge created successfully.' });
    } catch (error) {
        console.error("Erro ao criar cobrança Pix:", error);
        res.status(500).json({ message: 'Erro interno ao criar cobrança Pix.' });
    }
};
