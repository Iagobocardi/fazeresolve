// Arquivo: src/services/commandParser.js
// O comando 'finalizar' agora regista a data de conclusão.

const Orcamento = require('../models/orcamento.model');
const Cliente = require('../models/cliente.model');
const Agendamento = require('../models/agendamento.model');
const Servico = require('../models/servico.model');

const parseAndExecute = async (commandText, user, sendMessageFunction) => {
    const normalizedCommand = commandText.toLowerCase().trim();

    // --- COMANDO 'finalizar' MODIFICADO ---
    const finalizeMatch = normalizedCommand.match(/^finalizar\s+([a-f0-9]{6})$/);
    if (finalizeMatch) {
        try {
            const shortIdToFind = finalizeMatch[1];
            const orcamento = await Orcamento.findOne({ shortId: shortIdToFind }).populate('cliente');

            if (!orcamento) {
                return `❗ Pedido com ID "${shortIdToFind}" não encontrado.`;
            }
            if (orcamento.status === 'Finalizado') {
                return `Este pedido já foi finalizado anteriormente.`;
            }

            orcamento.status = 'Finalizado';
            // MODIFICAÇÃO: Registamos a data e hora exatas da finalização.
            orcamento.dataFinalizacao = new Date();
            await orcamento.save();

            if (user.activeContext && user.activeContext.toString() === orcamento._id.toString()) {
                user.activeContext = null;
                await user.save();
            }

            const clientName = orcamento.cliente ? orcamento.cliente.nome : 'um cliente';
            return `✅ Pedido #${orcamento.shortId} de ${clientName} foi marcado como finalizado!\nA pesquisa de satisfação será enviada ao cliente em 2 dias.`;

        } catch (error) {
            console.error("Erro no comando 'finalizar':", error);
            return "Ocorreu um erro ao tentar finalizar o serviço.";
        }
    }

    // --- Outros comandos (agendar, ver, etc.) permanecem os mesmos ---
    // (O resto do seu código do commandParser continua aqui, sem alterações)
    if (normalizedCommand === 'voltar' || normalizedCommand === 'cancelar') {
        if (user.activeContext) {
            user.activeContext = null;
            await user.save();
            return "✅ Ação cancelada. O contexto do pedido foi limpo.";
        } else {
            return "Nenhuma ação em andamento para cancelar.";
        }
    }
    const scheduleMatch = normalizedCommand.match(/^agendar\s+para\s+(.+)$/);
    if (scheduleMatch) {
        if (!user.activeContext) return "❗Erro: Você precisa visualizar um pedido primeiro com `ver [ID]`.";
        try {
            const dateText = scheduleMatch[1];
            const orcamento = await Orcamento.findById(user.activeContext).populate('cliente');
            if (!orcamento) { user.activeContext = null; await user.save(); return `❗Erro: O pedido não foi encontrado.`; }

            // 1. Atualizar o orçamento
            orcamento.status = 'Agendado';
            
            // Tenta converter o texto da data para um objeto Date.
            // NOTA: Isto é frágil e pode não funcionar para todos os formatos de texto.
            // Uma biblioteca de parsing de datas como 'date-fns' ou 'moment.js' seria mais robusta.
            const dataAgendamento = new Date(dateText);
            orcamento.dataAgendamento = isNaN(dataAgendamento) ? null : dataAgendamento;

            // 2. Criar um novo agendamento no sistema de agendamentos
            // Procura por um serviço padrão ou o primeiro serviço disponível
            let servicoPadrao = await Servico.findOne({ nome: "Visita Técnica" });
            if (!servicoPadrao) {
                servicoPadrao = await Servico.findOne();
            }
            if (!servicoPadrao) {
                 return "❗Erro Crítico: Não foi possível encontrar um serviço padrão para criar o agendamento. Cadastre um serviço no sistema.";
            }

            const novoAgendamento = new Agendamento({
                dataHoraInicio: dataAgendamento,
                // Define a data de fim para 1 hora após o início, como padrão
                dataHoraFim: new Date(dataAgendamento.getTime() + 60 * 60 * 1000), 
                servico: servicoPadrao._id,
                cliente: orcamento.cliente._id,
                observacoes: `Agendamento criado a partir do pedido #${orcamento.shortId}. Descrição original: ${orcamento.descricao}`
            });

            await novoAgendamento.save();
            await orcamento.save();
            
            user.activeContext = null;
            await user.save();

            const notificationMessage = `🗓️ Ótima notícia! O seu serviço referente a "${orcamento.descricao.slice(0, 20)}..." foi agendado para *${dateText}*.`;
            await sendMessageFunction(orcamento.cliente.telefone, notificationMessage);
            return `✅ Pedido #${orcamento.shortId} agendado com sucesso para *${dateText}*.\nO cliente ${orcamento.cliente.nome} foi notificado.`;
        } catch (error) {
            console.error("Erro no comando 'agendar':", error);
            return "Ocorreu um erro ao tentar agendar o serviço.";
        }
    }
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
            if (orcamento.address) { response += `*Endereço:* ${orcamento.address}\n`; }
            response += `\n*Descrição:* ${orcamento.descricao}\n`;
            if (orcamento.dataAgendamento) { response += `*Sugestão de Data do Cliente:* ${orcamento.dataAgendamento}\n`; }
            response += `\n---\n`;

            if (orcamento.media && orcamento.media.length > 0) {
                const clientPhoneNumber = orcamento.cliente.telefone.replace(/\D/g, '');
                const whatsappLink = `https://wa.me/${clientPhoneNumber}`;
                response += `📷 *Este pedido contém mídia.*\n👉 Clique para ver: ${whatsappLink}\n\n`;
            }

            response += `*Ações Disponíveis:*\n`;
            response += `👉 Para aceitar o orçamento, responda: \`aceitar valor [VALOR]\`\n`;
            response += `👉 Para agendar, responda: \`agendar para [DATA]\`\n`;
            response += `👉 Para rejeitar, responda: \`rejeitar\`\n`;
            response += `👉 Para finalizar o pedido, responda: \`finalizar ${orcamento.shortId}\`\n`;
            response += `👉 Para cancelar, responda: \`voltar\``;
            return response;
        } catch (error) {
            console.error("Erro no comando 'ver':", error);
            return "Ocorreu um erro ao buscar os detalhes do pedido.";
        }
    }
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
    if (normalizedCommand === 'rejeitar') {
        if (!user.activeContext) return "❗Erro: Você precisa visualizar um pedido primeiro. Use o comando `ver [ID]`.";
        try {
            const orcamento = await Orcamento.findById(user.activeContext).populate('cliente');
            if (!orcamento.cliente) return `Erro de dados: O cliente para o pedido que você está a tentar rejeitar não foi encontrado.`;

            orcamento.status = 'Rejeitado';
            await orcamento.save();
            user.activeContext = null;
            await user.save();
            const rejectionMessage = `Informação sobre o seu pedido: Infelizmente, não poderemos prosseguir com a sua solicitação "${orcamento.descricao.slice(0, 20)}..." no momento. Agradecemos o seu contato.`;
            await sendMessageFunction(orcamento.cliente.telefone, rejectionMessage);
            return `❌ Pedido #${orcamento.shortId} de ${orcamento.cliente.nome} foi rejeitado e o cliente notificado.`;
        } catch (error) {
            console.error("Erro no comando 'rejeitar':", error);
            return "Ocorreu um erro ao rejeitar o pedido.";
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
    let helpMenu = `Comando não reconhecido: "${commandText}".\n\n*Menu de Comandos Disponíveis:*\n\n`;
    helpMenu += `\`listar pendentes\`\n- Mostra um resumo dos novos pedidos.\n\n`;
    helpMenu += `\`ver [ID]\`\n- Exibe todos os detalhes de um pedido específico.\n\n`;
    helpMenu += `\`finalizar [ID]\`\n- Marca um pedido como concluído.\n\n`;
    helpMenu += `\`voltar\` ou \`cancelar\`\n- Limpa o pedido que você está a visualizar.\n\n`;
    helpMenu += `Depois de usar 'ver [ID]', você pode usar:\n`;
    helpMenu += `  \`aceitar valor [VALOR]\`\n`;
    helpMenu += `  \`agendar para [DATA]\`\n`;
    helpMenu += `  \`rejeitar\``;
    return helpMenu;
};

module.exports = {
    parseAndExecute
};
