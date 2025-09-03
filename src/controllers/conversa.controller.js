const Conversa = require('../models/conversa.model');
const whatsappService = require('../services/whatsapp.service');
const Cliente = require('../models/cliente.model');

// Obter todas as conversas de uma conta
const getConversas = async (req, res) => {
    try {
        // O authMiddleware já garante que req.user e req.user.contaId existem
        const { contaId } = req.user;
        
        const conversas = await Conversa.find({ contaId: contaId })
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
        const { contaId } = req.user;
        const { conversaId, texto } = req.body;

        if (!conversaId || !texto) {
            return res.status(400).json({ message: 'Os campos "conversaId" e "texto" são obrigatórios.' });
        }

        const conversa = await Conversa.findOne({ _id: conversaId, contaId: contaId });

        if (!conversa) {
            return res.status(404).json({ message: 'Conversa não encontrada ou não pertence a esta conta.' });
        }

        conversa.mensagens.push({
            remetente: 'prestador',
            texto: texto
        });
        // Quando o prestador envia, a conversa é considerada "lida" por ele.
        conversa.lidaPeloPrestador = true; 
        const conversaAtualizada = await conversa.save();

        const cliente = await Cliente.findById(conversa.cliente);
        if (!cliente) {
            // Isso seria um erro de dados, mas é bom ter um fallback.
            return res.status(404).json({ message: 'Cliente da conversa não encontrado.' });
        }
        
        await whatsappService.sendWhatsAppMessage(cliente.telefone, texto);

        res.status(201).json({ message: 'Mensagem enviada com sucesso!', conversa: conversaAtualizada });

    } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        res.status(500).json({ message: 'Erro ao enviar mensagem.' });
    }
};

// Obter uma conversa específica por ID
const getConversaById = async (req, res) => {
    try {
        const { contaId } = req.user;
        const { id } = req.params;

        const conversa = await Conversa.findOne({ _id: id, contaId: contaId })
            .populate('cliente', 'nome telefone email');

        if (!conversa) {
            return res.status(404).json({ message: 'Conversa não encontrada ou não pertence a esta conta.' });
        }

        // Marca a conversa como lida ao ser aberta
        if (!conversa.lidaPeloPrestador) {
            conversa.lidaPeloPrestador = true;
            await conversa.save();
        }

        res.status(200).json(conversa);
    } catch (error) {
        console.error("Erro ao buscar conversa por ID:", error);
        res.status(500).json({ message: 'Erro ao buscar conversa.' });
    }
};

module.exports = { getConversas, getConversaById, enviarMensagem };
