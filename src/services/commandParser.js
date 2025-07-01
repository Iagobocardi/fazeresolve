// Arquivo: src/services/commandParser.js
// Modificado para exibir o endereço do cliente e corrigir o menu de ajuda.

const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');

const parseAndExecute = async (commandText, user, sendMessageFunction) => {
    const normalizedCommand = commandText.toLowerCase().trim();

    // --- Comando 'confirmar agendamento' ---
    if (normalizedCommand === 'confirmar agendamento') {
        if (!user.activeContext) return "❗Erro: Você precisa visualizar um pedido primeiro. Use o comando `ver [ID]`.";
        try {
            const orcamento = await Orcamento.findById(user.activeContext).populate('cliente');
            if (!orcamento) { user.activeContext = null; await user.save(); return `❗Erro: O pedido não foi encontrado.`; }

            orcamento.status = 'Agendado';
            await orcamento.save();
            user.activeContext = null;
            await user.save();

            const notificationMessage = `✅ Agendamento Confirmado! O seu serviço foi confirmado para a data que você sugeriu: *${orcamento.dataAgendamento}*.`;
            await sendMessageFunction(orcamento.cliente.telefone, notificationMessage);

            return `✅ Agendamento do pedido #${orcamento.shortId} confirmado.\nO cliente ${orcamento.cliente.nome} foi notificado.`;
        } catch (error) {
            console.error("Erro no comando 'confirmar agendamento':", error);
            return "Ocorreu um erro ao confirmar o agendamento.";
        }
    }

    // --- Comando 'reagendar' ---
    if (normalizedCommand === 'reagendar') {
        if (!user.activeContext) return "❗Erro: Você precisa visualizar um pedido primeiro. Use o comando `ver [ID]`.";
        try {
            const orcamento = await Orcamento.findById(user.activeContext).populate('cliente');
            if (!orcamento) { user.activeContext = null; await user.save(); return `❗Erro: O pedido não foi encontrado.`; }

            user.activeContext = null;
            await user.save();

            const clientPhoneNumber = orcamento.cliente.telefone.replace(/\D/g, '');
            const whatsappLink = `https://wa.me/${clientPhoneNumber}`;
            return `Ok. Por favor, entre em contato direto com *${orcamento.cliente.nome}* para definir uma nova data.\n\nClique aqui para abrir a conversa: ${whatsappLink}`;
        } catch (error) {
            console.error("Erro no comando 'reagendar':", error);
            return "Ocorreu um erro.";
        }
    }

    // --- Comando 'ver' MODIFICADO para mostrar o endereço ---
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
            response += `*Telefone:* ${orcamento.cliente.telefone}\n`;
            // MODIFICAÇÃO: Exibe o endereço do cliente.
            if (orcamento.address) {
                response += `*Endereço:* ${orcamento.address}\n`;
            }
            response += `\n*Descrição:* ${orcamento.descricao}\n`;
            if (orcamento.dataAgendamento) {
                response += `*Sugestão de Data do Cliente:* ${orcamento.dataAgendamento}\n`;
            }
            response += `\n---\n`;

            if (orcamento.media && orcamento.media.length > 0) {
                const clientPhoneNumber = orcamento.cliente.telefone.replace(/\D/g, '');
                const whatsappLink = `https://wa.me/${clientPhoneNumber}`;
                response += `📷 *Este pedido contém mídia.*\n👉 Clique para ver: ${whatsappLink}\n\n`;
            }

            response += `*Ações Disponíveis:*\n`;
            response += `👉 Para aceitar o orçamento, responda: \`aceitar valor [VALOR]\`\n`;
            response += `👉 Para confirmar a data, responda: \`confirmar agendamento\`\n`;
            response += `👉 Para combinar outra data, responda: \`reagendar\``;
            return response;
        } catch (error) {
            console.error("Erro no comando 'ver':", error);
            return "Ocorreu um erro ao buscar os detalhes do pedido.";
        }
    }
    
    // --- Outros comandos (aceitar, listar) ---
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
            const notificationMessage = `Boas notícias! O seu orçamento para "${orcamento.descricao.slice(0, 20)}..." foi aceite com o valor de R$ ${valor.toFixed(2)}. Entraremos em contato para agendar.`;
            await sendMessageFunction(orcamento.cliente.telefone, notificationMessage);
            return `✅ Orçamento para o pedido #${orcamento.shortId} aceite com o valor de R$ ${valor.toFixed(2)}!\nO cliente ${orcamento.cliente.nome} foi notificado.`;
        } catch (error) {
            console.error("Erro no comando 'aceitar':", error);
            return "Ocorreu um erro ao aceitar o orçamento.";
        }
    }
    
    if (normalizedCommand === 'listar pendentes') {
        try {
            const pendentes = await Orcamento.find({ status: 'Pendente' }).populate('cliente', 'nome').sort({ data: -1 });
            if (pendentes.length === 0) return "✅ Não há nenhuma solicitação pendente no momento.";

            let response = "🔔 *Novas Solicitações Pendentes:*\n\n";
            pendentes.forEach(orcamento => {
                const clientName = orcamento.cliente ? orcamento.cliente.nome : 'Cliente Removido';
                const requestDate = orcamento.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                response += `📝 *Pedido #${orcamento.shortId || orcamento._id.toString().slice(-6)}*\n`;
                response += `*Data:* ${requestDate}\n`;
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

    // MODIFICAÇÃO: Menu de ajuda para comandos não reconhecidos.
    let helpMenu = `Comando não reconhecido: "${commandText}".\n\n*Menu de Comandos Disponíveis:*\n\n`;
    helpMenu += `\`listar pendentes\`\n- Mostra um resumo dos novos pedidos.\n\n`;
    helpMenu += `\`ver [ID]\`\n- Exibe todos os detalhes de um pedido específico.\n\n`;
    helpMenu += `Depois de usar 'ver [ID]', você pode usar:\n`;
    helpMenu += `  \`aceitar valor [VALOR]\`\n`;
    helpMenu += `  \`confirmar agendamento\`\n`;
    helpMenu += `  \`reagendar\``;

    return helpMenu;
};

module.exports = {
    parseAndExecute
};
