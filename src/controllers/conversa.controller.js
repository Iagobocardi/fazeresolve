const Conversa = require('../models/conversa.model');
const whatsappService = require('../services/whatsapp.service');
const Cliente = require('../models/cliente.model');

// Obter todas as conversas de um prestador
const getConversas = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Não autorizado. Faça o login novamente.' });
        }
        
        const prestadorId = req.user.id;
        
        const conversas = await Conversa.find({ prestador: prestadorId })
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
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'Não autorizado. Faça o login novamente.' });
        }

        const { conversaId, texto } = req.body;
        const prestadorId = req.user.id;

        const conversa = await Conversa.findById(conversaId);

        if (!conversa || conversa.prestador.toString() !== prestadorId) {
            return res.status(404).json({ message: 'Conversa não encontrada ou não pertence a este prestador.' });
        }

        conversa.mensagens.push({
            remetente: 'prestador',
            texto: texto
        });
        await conversa.save();

        const cliente = await Cliente.findById(conversa.cliente);
        
        // A chamada ao whatsappService permanece aqui
        await whatsappService.sendWhatsAppMessage(cliente.telefone, texto);

        res.status(201).json({ message: 'Mensagem enviada com sucesso!', conversa });

    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        res.status(500).json({ message: 'Erro ao enviar mensagem.' });
    }
};

module.exports = { getConversas, enviarMensagem };
