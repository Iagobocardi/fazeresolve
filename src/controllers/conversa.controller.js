const Conversa = require('../models/conversa.model');
const whatsappService = require('../services/whatsapp.service');
const Cliente = require('../models/cliente.model');

// Obter todas as conversas de uma conta
const getConversas = async (req, res) => {
    try {
        if (!req.user || !req.user.contaId) {
            return res.status(401).json({ message: 'Não autorizado. Conta não identificada.' });
        }
        
        const { contaId } = req.user;
        
        const conversas = await Conversa.find({ contaId }) // MUDANÇA
            .populate('cliente', 'nome telefone')
            .sort({ updatedAt: -1 });

        res.status(200).json(conversas);
    } catch (error) {
        console.error("Erro ao buscar conversas:", error);
        res.status(500).json({ message: 'Erro ao buscar conversas.' });
    }
};

// Enviar uma mensagem a partir da Caixa de Entrada
const enviarMensagem = async (req, res) => {
    try {
        if (!req.user || !req.user.contaId) {
            return res.status(401).json({ message: 'Não autorizado. Conta não identificada.' });
        }

        const { conversaId, texto } = req.body;
        const { contaId } = req.user; // MUDANÇA

        const conversa = await Conversa.findById(conversaId);

        // MUDANÇA: Verifica se a conversa pertence à conta do usuário
        if (!conversa || conversa.contaId.toString() !== contaId) {
            return res.status(404).json({ message: 'Conversa não encontrada ou não pertence a esta conta.' });
        }

        conversa.mensagens.push({
            remetente: 'prestador',
            texto: texto
        });
        await conversa.save();

        const cliente = await Cliente.findById(conversa.cliente);
        
        if (cliente) {
            await whatsappService.sendWhatsAppMessage(cliente.telefone, texto);
        } else {
            console.error(`Cliente da conversa ${conversaId} não encontrado para envio de WhatsApp.`);
        }

        res.status(201).json({ message: 'Mensagem enviada com sucesso!', conversa });

    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        res.status(500).json({ message: 'Erro ao enviar mensagem.' });
    }
};

module.exports = { getConversas, enviarMensagem };
