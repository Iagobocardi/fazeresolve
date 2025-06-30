// Arquivo: src/services/commandParser.js
// Corrigido para receber e usar a função de envio de mensagem real.

const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');

/**
 * Analisa o texto de um comando e executa a ação correspondente.
 * @param {string} commandText - O texto da mensagem enviada pelo prestador.
 * @param {object} user - O documento do prestador que está a executar o comando.
 * @param {function} sendMessageFunction - A função real para enviar mensagens via WhatsApp.
 * @returns {Promise<string>} A mensagem de resposta a ser enviada de volta para o prestador.
 */
const parseAndExecute = async (commandText, user, sendMessageFunction) => {
    const normalizedCommand = commandText.toLowerCase().trim();

    // --- Comando: ver [ID] ---
    const viewMatch = normalizedCommand.match(/^ver\s+([a-f0-9]{6})$/);
    if (viewMatch) {
        try {
            const shortIdToFind = viewMatch[1];
            const orcamento = await Orcamento.findOne({ shortId: shortIdToFind }).populate('cliente');
            if (!orcamento) return `Pedido com ID "${shortIdToFind}" não encontrado.`;
            if (!orcamento.cliente) return `Erro de dados: O cliente para o pedido #${shortIdToFind} não foi encontrado.`;

            user.activeContext = orcamento._id;
            await user.save();

            let response = `*Detalhes do Pedido #${orcamento.shortId}*\n\n`;
            response += `*Cliente:* ${orcamento.cliente.nome}\n`;
            response += `*Telefone:* ${orcamento.cliente.telefone}\n\n`;
            response += `*Descrição Completa:*\n${orcamento.descricao}\n\n`;
            if (orcamento.mediaUrls && orcamento.mediaUrls.length > 0) {
                response += `*Mídia Enviada (clique para ver):*\n`;
                orcamento.mediaUrls.forEach(url => { response += `🔗 ${url}\n`; });
            }
            response += `\n---\n*Ações Disponíveis:*\n`;
            response += `👉 Para aceitar, responda: \`aceitar valor [VALOR]\`\n`;
            response += `👉 Para rejeitar, responda: \`rejeitar\``;
            return response;
        } catch (error) {
            console.error("Erro no comando 'ver':", error);
            return "Ocorreu um erro ao buscar os detalhes do pedido.";
        }
    }

    // --- Comando: aceitar valor [VALOR] ---
    const acceptMatch = normalizedCommand.match(/^aceitar\s+valor\s+([0-9,.]+)/);
    if (acceptMatch) {
        if (!user.activeContext) return "❗Erro: Você precisa visualizar um pedido primeiro. Use o comando `ver [ID]`.";
        try {
            const valor = parseFloat(acceptMatch[1].replace(',', '.'));
            const orcamento = await Orcamento.findById(user.activeContext).populate('cliente');
            if (!orcamento.cliente) return `Erro de dados: O cliente para o pedido que você está a tentar aceitar não foi encontrado.`;

            orcamento.status = 'Aceito';
            orcamento.valorProposto = valor;
            await orcamento.save();
            user.activeContext = null;
            await user.save();
            
            // ===============================================================
            // MODIFICAÇÃO APLICADA AQUI
            // Agora usamos a função real para enviar a notificação.
            // ===============================================================
            const notificationMessage = `Boas notícias! O seu orçamento para "${orcamento.descricao.slice(0, 20)}..." foi aceite com o valor de R$ ${valor.toFixed(2)}. Entraremos em contato para agendar.`;
            await sendMessageFunction(orcamento.cliente.telefone, notificationMessage);
            
            return `✅ Orçamento para o pedido #${orcamento.shortId} aceite com o valor de R$ ${valor.toFixed(2)}!\nO cliente ${orcamento.cliente.nome} foi notificado.`;
        } catch (error) {
            console.error("Erro no comando 'aceitar':", error);
            return "Ocorreu um erro ao aceitar o orçamento.";
        }
    }
    
    // --- Comando: rejeitar ---
    if (normalizedCommand === 'rejeitar') {
        if (!user.activeContext) return "❗Erro: Você precisa visualizar um pedido primeiro. Use o comando `ver [ID]`.";
        try {
            const orcamento = await Orcamento.findById(user.activeContext).populate('cliente');
            if (!orcamento.cliente) return `Erro de dados: O cliente para o pedido que você está a tentar rejeitar não foi encontrado.`;

            orcamento.status = 'Rejeitado';
            await orcamento.save();
            user.activeContext = null;
            await user.save();

            // Usamos a função real para enviar a notificação de rejeição
            const rejectionMessage = `Informação sobre o seu pedido: Infelizmente, não poderemos prosseguir com a sua solicitação "${orcamento.descricao.slice(0, 20)}..." no momento. Agradecemos o seu contato.`;
            await sendMessageFunction(orcamento.cliente.telefone, rejectionMessage);

            return `❌ Pedido #${orcamento.shortId} de ${orcamento.cliente.nome} foi rejeitado e o cliente notificado.`;
        } catch (error) {
            console.error("Erro no comando 'rejeitar':", error);
            return "Ocorreu um erro ao rejeitar o pedido.";
        }
    }

    // --- Comando: listar pendentes ---
    if (normalizedCommand === 'listar pendentes') {
        try {
            const pendentes = await Orcamento.find({ status: 'Pendente' }).populate('cliente', 'nome').sort({ data: -1 });
            if (pendentes.length === 0) return "✅ Não há nenhuma solicitação pendente no momento.";

            let response = "🔔 *Novas Solicitações Pendentes:*\n\n";
            pendentes.forEach(orcamento => {
                const clientName = orcamento.cliente ? orcamento.cliente.nome : 'Cliente Removido';
                response += `📝 *Pedido #${orcamento.shortId || orcamento._id.toString().slice(-6)}*\n`;
                response += `*Cliente:* ${clientName}\n`;
                response += `*Descrição:* ${(orcamento.descricao || 'Sem descrição').slice(0, 50)}...\n\n`;
            });
            response += "Para ver os detalhes de um pedido, envie: `ver [ID]`";
            return response;
        } catch (error) {
            console.error("Erro ao listar pendentes:", error);
            return "Ocorreu um erro ao buscar as solicitações.";
        }
    }

    return `Comando não reconhecido: "${commandText}".\n\nComandos disponíveis:\n- *listar pendentes*\n- *ver [ID]*`;
};

module.exports = {
    parseAndExecute
};
