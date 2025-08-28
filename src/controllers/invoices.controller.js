const NotaFiscal = require('../models/notaFiscal.model.js');
const Conta = require('../models/conta.model.js'); // MUDANÇA
const focusnfeService = require('../services/focusnfe.service.js');

// Criar uma nova nota fiscal (como rascunho)
exports.createInvoice = async (req, res) => {
    try {
        const { id: userId, contaId } = req.user; // MUDANÇA
        const invoiceData = {
            ...req.body,
            prestador: userId, // Quem criou
            contaId: contaId, // A que conta pertence
            status: 'rascunho'
        };

        invoiceData.numero = Math.floor(Math.random() * 10000);
        invoiceData.serie = 1;

        const newInvoice = new NotaFiscal(invoiceData);
        await newInvoice.save();
        res.status(201).json(newInvoice);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao criar nota fiscal.', error: error.message });
    }
};

// Obter todas as notas fiscais da conta logada
exports.getAllInvoices = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const invoices = await NotaFiscal.find({ contaId }).sort({ createdAt: -1 }); // MUDANÇA
        res.status(200).json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar notas fiscais.', error: error.message });
    }
};

// Obter uma nota fiscal por ID
exports.getInvoiceById = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const invoice = await NotaFiscal.findOne({ _id: req.params.id, contaId }); // MUDANÇA
        if (!invoice) {
            return res.status(404).json({ message: 'Nota fiscal não encontrada ou não pertence a esta conta.' });
        }
        res.status(200).json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar nota fiscal.', error: error.message });
    }
};

// Atualizar uma nota fiscal (apenas se for rascunho)
exports.updateInvoice = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const invoice = await NotaFiscal.findOneAndUpdate(
            { _id: req.params.id, contaId, status: 'rascunho' }, // MUDANÇA
            req.body,
            { new: true }
        );

        if (!invoice) {
            return res.status(404).json({ message: 'Nota fiscal em modo rascunho não encontrada nesta conta.' });
        }
        res.status(200).json(invoice);
    } catch (error) {
        res.status(400).json({ message: 'Erro ao atualizar nota fiscal.', error: error.message });
    }
};

// Deletar uma nota fiscal (apenas se for rascunho)
exports.deleteInvoice = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const invoice = await NotaFiscal.findOneAndDelete({ _id: req.params.id, contaId, status: 'rascunho' }); // MUDANÇA

        if (!invoice) {
            return res.status(404).json({ message: 'Nota fiscal em modo rascunho não encontrada nesta conta.' });
        }
        res.status(200).json({ message: 'Nota fiscal deletada com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar nota fiscal.', error: error.message });
    }
};

// Emitir uma nota fiscal (chama a API externa)
exports.issueInvoice = async (req, res) => {
    try {
        const { contaId } = req.user; // MUDANÇA
        const { id: invoiceId } = req.params;

        const invoice = await NotaFiscal.findOne({ _id: invoiceId, contaId }); // MUDANÇA
        if (!invoice) {
            return res.status(404).json({ message: 'Nota fiscal não encontrada.' });
        }
        if (invoice.status !== 'rascunho') {
            return res.status(400).json({ message: 'Apenas notas em rascunho podem ser emitidas.' });
        }

        const conta = await Conta.findById(contaId); // MUDANÇA: Busca a Conta
        if (!conta || !conta.focusNFeApiToken) {
            return res.status(400).json({ message: 'Token da API Focus NFe não configurado para esta conta.' });
        }

        invoice.status = 'processando_emissao';
        await invoice.save();

        // MUDANÇA: Passa o objeto 'conta' em vez de 'provider'
        const apiResponse = await focusnfeService.emitirNotaFiscal(invoice, conta);

        invoice.status = apiResponse.status;
        invoice.focusNFeId = apiResponse.id;
        invoice.pdfUrl = apiResponse.caminho_danfe;
        invoice.xmlUrl = apiResponse.caminho_xml_nota_fiscal;
        invoice.focusNFeResponse = apiResponse;

        const finalInvoice = await invoice.save();
        res.status(200).json({ message: `Nota fiscal enviada. Status: ${finalInvoice.status}`, invoice: finalInvoice });

    } catch (error) {
        try {
            await NotaFiscal.findByIdAndUpdate(req.params.id, { status: 'erro_emissao' });
        } catch (revertError) {
            console.error('Erro ao reverter status da nota fiscal:', revertError);
        }
        res.status(500).json({ message: 'Erro ao emitir nota fiscal.', error: error.message });
    }
};
