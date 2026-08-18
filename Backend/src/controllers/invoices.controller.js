const NotaFiscal = require('../models/notaFiscal.model.js');

// Criar uma nova nota fiscal (como rascunho)
exports.createInvoice = async (req, res) => {
    try {
        const prestadorId = req.user.id;
        const invoiceData = { ...req.body, prestador: prestadorId, status: 'rascunho' };

        // Lógica para obter o próximo número da nota, etc. iria aqui
        // Por simplicidade, vamos usar um número aleatório por agora.
        invoiceData.numero = Math.floor(Math.random() * 10000);
        invoiceData.serie = 1;

        const newInvoice = new NotaFiscal(invoiceData);
        await newInvoice.save();
        res.status(201).json(newInvoice);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar nota fiscal.', error: error.message });
    }
};

// Obter todas as notas fiscais do prestador logado
exports.getAllInvoices = async (req, res) => {
    try {
        const prestadorId = req.user.id;
        const invoices = await NotaFiscal.find({ prestador: prestadorId }).sort({ createdAt: -1 });
        res.status(200).json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar notas fiscais.', error: error.message });
    }
};

// Obter uma nota fiscal por ID
exports.getInvoiceById = async (req, res) => {
    try {
        const prestadorId = req.user.id;
        const invoice = await NotaFiscal.findOne({ _id: req.params.id, prestador: prestadorId });
        if (!invoice) {
            return res.status(404).json({ message: 'Nota fiscal não encontrada ou não pertence a este prestador.' });
        }
        res.status(200).json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar nota fiscal.', error: error.message });
    }
};

// Atualizar uma nota fiscal (apenas se for rascunho)
exports.updateInvoice = async (req, res) => {
    try {
        const prestadorId = req.user.id;
        const invoice = await NotaFiscal.findOne({ _id: req.params.id, prestador: prestadorId });

        if (!invoice) {
            return res.status(404).json({ message: 'Nota fiscal não encontrada.' });
        }
        if (invoice.status !== 'rascunho') {
            return res.status(400).json({ message: 'Apenas notas fiscais em modo rascunho podem ser editadas.' });
        }

        const updatedInvoice = await NotaFiscal.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(updatedInvoice);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar nota fiscal.', error: error.message });
    }
};

// Deletar uma nota fiscal (apenas se for rascunho)
exports.deleteInvoice = async (req, res) => {
    try {
        const prestadorId = req.user.id;
        const invoice = await NotaFiscal.findOne({ _id: req.params.id, prestador: prestadorId });

        if (!invoice) {
            return res.status(404).json({ message: 'Nota fiscal não encontrada.' });
        }
        if (invoice.status !== 'rascunho') {
            return res.status(400).json({ message: 'Apenas notas fiscais em modo rascunho podem ser deletadas.' });
        }

        await NotaFiscal.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Nota fiscal deletada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar nota fiscal.', error: error.message });
    }
};

const focusnfeService = require('../services/focusnfe.service.js');
const Cliente = require('../models/cliente.model.js');

// Emitir uma nota fiscal (chama a API externa)
exports.issueInvoice = async (req, res) => {
    try {
        const prestadorId = req.user.id;
        const { id: invoiceId } = req.params;

        // 1. Pega os dados da nota e do prestador
        const invoice = await NotaFiscal.findOne({ _id: invoiceId, prestador: prestadorId });
        if (!invoice) {
            return res.status(404).json({ message: 'Nota fiscal não encontrada.' });
        }
        if (invoice.status !== 'rascunho') {
            return res.status(400).json({ message: 'Apenas notas em rascunho podem ser emitidas.' });
        }

        const provider = await Cliente.findById(prestadorId);
        if (!provider || !provider.focusNFeApiToken) {
            return res.status(400).json({ message: 'Token da API Focus NFe não configurado para este prestador.' });
        }

        // 2. Atualiza o status para "processando"
        invoice.status = 'processando_emissao';
        await invoice.save();

        // 3. Chama o serviço para emitir a nota (operação pode ser longa)
        const apiResponse = await focusnfeService.emitirNotaFiscal(invoice, provider);

        // 4. Atualiza a nota fiscal com a resposta da API
        invoice.status = apiResponse.status; // ex: 'autorizada' ou 'erro_emissao'
        invoice.focusNFeId = apiResponse.id;
        invoice.pdfUrl = apiResponse.caminho_danfe;
        invoice.xmlUrl = apiResponse.caminho_xml_nota_fiscal;
        invoice.focusNFeResponse = apiResponse; // Guarda a resposta completa para referência

        const finalInvoice = await invoice.save();

        res.status(200).json({ message: `Nota fiscal enviada para processamento. Status: ${finalInvoice.status}`, invoice: finalInvoice });

    } catch (error) {
        // Se a emissão falhar, reverte o status para rascunho para que o usuário possa corrigir
        try {
            await NotaFiscal.findByIdAndUpdate(req.params.id, { status: 'erro_emissao' });
        } catch (revertError) {
            console.error('Erro ao reverter status da nota fiscal:', revertError);
        }
        res.status(500).json({ message: 'Erro ao emitir nota fiscal.', error: error.message });
    }
};
