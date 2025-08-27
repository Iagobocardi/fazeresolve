// Arquivo: src/services/whatsapp.service.js
// Versão FINAL, unindo a SUA lógica de conversa com as novas funcionalidades e correções estruturais.

const Cliente = require('../models/cliente.model');
const Orcamento = require('../models/orcamento.model');
const commandParser = require('./commandParser.js');
const chrono = require('chrono-node');
const axios = require('axios');
const Conversa = require('../models/conversa.model');
const WhatsappTemplate = require('../models/whatsappTemplate.model.js');


/**
 * Renderiza uma mensagem de template com os dados de um orçamento.
 * @param {string} tituloTemplate - O título do template a ser usado (ex: "Lembrete de Agendamento").
 * @param {object} orcamento - O objeto completo do orçamento com os dados do cliente.
 * @returns {Promise<string>} A mensagem final com os placeholders substituídos.
 */
const renderTemplate = async (tituloTemplate, orcamento) => {
    try {
        const template = await WhatsappTemplate.findOne({ titulo: tituloTemplate });
        if (!template) {
            throw new Error(`Template "${tituloTemplate}" não encontrado.`);
        }

        let mensagemRenderizada = template.mensagem;

        // Substitui os placeholders. Pode adicionar mais aqui.
        mensagemRenderizada = mensagemRenderizada.replace(/{{cliente.nome}}/g, orcamento.cliente.nome);
        mensagemRenderizada = mensagemRenderizada.replace(/{{orcamento.shortId}}/g, orcamento.shortId);
        
        if (orcamento.valorProposto) {
            const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orcamento.valorProposto);
            mensagemRenderizada = mensagemRenderizada.replace(/{{orcamento.valorProposto}}/g, valorFormatado);
        }
        if (orcamento.dataAgendamento) {
            const dataFormatada = new Date(orcamento.dataAgendamento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
            mensagemRenderizada = mensagemRenderizada.replace(/{{orcamento.dataAgendamento}}/g, dataFormatada);
        }

        return mensagemRenderizada;
    } catch (error) {
        console.error("Erro ao renderizar o template:", error);
        return null; // Retorna nulo se o template não puder ser renderizado
    }
};

// 1. Cliente Twilio e número de telefone definidos UMA VEZ no topo.
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioPhoneNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

// =======================================================
// FUNÇÃO 1: Enviar mensagens de texto ou com mídia
// =======================================================
const sendWhatsAppMessage = async (phoneNumber, message = '', mediaUrls = []) => {
    if (!phoneNumber) {
        console.error("[SERVICE] ERRO: Tentativa de enviar mensagem para um número indefinido.");
        return;
    }
    try {
        const messageData = {
            from: twilioPhoneNumber,
            to: `whatsapp:${phoneNumber}`,
            // =======================================================
            // 👉 A CORREÇÃO FINAL ESTÁ AQUI
            //    Enviamos um StatusCallback vazio para sobrepor a
            //    configuração inválida ('none') que está na sua conta Twilio.
            // =======================================================
            statusCallback: 'http://demo.twilio.com/'
        };

        if (message && message.trim() !== '') {
            messageData.body = message;
        }
        if (mediaUrls && mediaUrls.length > 0) {
            messageData.mediaUrl = mediaUrls;
        }
        if (!messageData.body && !messageData.mediaUrl) {
            return;
        }

        // Já não precisamos do log de debug, pode ser removido
        // console.log("A enviar os seguintes dados para a API da Twilio:", JSON.stringify(messageData, null, 2));

        await twilioClient.messages.create(messageData);

        console.log(`[SERVICE] Mensagem enviada com sucesso para ${phoneNumber}.`);

    } catch (error) {
        // Agora, se o erro persistir, saberemos que é algo que só o suporte da Twilio pode resolver.
        console.error("[SERVICE] ERRO AO ENVIAR VIA TWILIO (APÓS CORREÇÃO):", error);
    }
};
const sendSatisfactionSurvey = async (clientPhone, orcamentoId) => {
    try {
        // Este é o objeto que define a mensagem interativa de lista
        const interactiveMessage = {
            interactive: {
                type: 'list',
                header: { type: 'text', text: 'Sua Opinião é Importante!' },
                body: { text: `Olá! Ficamos felizes em concluir seu serviço. 😊\n\nPara nos ajudar a melhorar, por favor, selecione uma nota de 1 a 5 estrelas.` },
                footer: { text: 'Agradecemos a preferência!' },
                action: {
                    button: 'Avalie nosso serviço',
                    sections: [{
                        title: 'Nível de Satisfação',
                        rows: [
                            { id: `rating_5_${orcamentoId}`, title: '⭐⭐⭐⭐⭐ (Excelente)' },
                            { id: `rating_4_${orcamentoId}`, title: '⭐⭐⭐⭐ (Bom)' },
                            { id: `rating_3_${orcamentoId}`, title: '⭐⭐⭐ (Regular)' },
                            { id: `rating_2_${orcamentoId}`, title: '⭐⭐ (Ruim)' },
                            { id: `rating_1_${orcamentoId}`, title: '⭐ (Péssimo)' },
                        ]
                    }]
                }
            }
        };

        // A chamada à API da Twilio usando o Content API
        await twilioClient.messages.create({
            from: twilioPhoneNumber,
            to: `whatsapp:${clientPhone}`,
            contentSid: process.env.TWILIO_CONTENT_SID, // Essencial que esta variável esteja no seu .env
            contentVariables: JSON.stringify({
                1: orcamentoId // Passa o ID do orçamento como variável para o template
            })
        });
        
        console.log(`[Whatsapp Service] Pesquisa de satisfação enviada para ${clientPhone}.`);

    } catch (error) {
        console.error(`[Whatsapp Service] Erro ao enviar pesquisa de satisfação:`, error.message);
        // Lançamos o erro para que o job que chamou esta função saiba que algo falhou.
        throw error;
    }
};

// =======================================================
// FUNÇÃO 3: Checar status de pedidos (SUA FUNÇÃO ORIGINAL)
// =======================================================
const handleCheckOrderStatus = async (user) => {
    const activeOrders = await Orcamento.find({ cliente: user._id, status: { $nin: ['Finalizado', 'Rejeitado'] } }).sort({ data: -1 });
    if (activeOrders.length === 0) {
        return "Verifiquei aqui e não encontrei nenhum serviço em andamento para si. Se desejar, pode iniciar um novo pedido escolhendo a opção 1 no menu.";
    }
    if (activeOrders.length === 1) {
        const order = activeOrders[0];
        let statusMessage = `Encontrei o seu pedido *#${order.shortId}*.\n\n*Descrição:* ${order.descricao.slice(0, 50)}...\n*Estado Atual:* ${order.status}\n\n`;
        if (order.status === 'Agendado') { statusMessage += `Ele está confirmado para a data: *${order.dataAgendamento}*.`;
        } else if (order.status === 'Aceito') { statusMessage += `O seu orçamento de R$ ${order.valorProposto.toFixed(2)} foi aceite. Em breve, entraremos em contato para agendar.`; 
        } else { statusMessage += `A sua solicitação está na nossa fila para análise. Entraremos em contato assim que possível.`; }
        return statusMessage;
    }
    
    let orderListMessage = "Encontrei mais de um serviço em andamento. Para ver os detalhes, responda com `ver pedido [NÚMERO]`.\n\n";
    user.currentDemand = user.currentDemand || {};
    user.currentDemand.pendingOrderIds = activeOrders.map(order => order._id);
    activeOrders.forEach((order, index) => {
        orderListMessage += `*${index + 1}.* Pedido #${order.shortId} - "${order.descricao.slice(0, 30)}..."\n`;
    });
    user.conversationState = 'AWAITING_ORDER_SELECTION';
    await user.save();
    return orderListMessage;
};

// =======================================================
// FUNÇÃO 4: Lidar com TODAS as mensagens que chegam do webhook
// =======================================================
const handleIncomingMessage = async (req) => {

     const prestadorPhone = process.env.PRESTADOR_TELEFONE;

    try {
        const { From, ProfileName, Body, NumMedia, ButtonPayload } = req.body;
        if (!From) { return console.log("Requisição ignorada por não conter remetente 'From'."); }

        const senderPhone = From.replace('whatsapp:', '');
        const messageBody = Body || '';
        const mediaUrls = [];
        if (NumMedia && parseInt(NumMedia) > 0) {
            for (let i = 0; i < NumMedia; i++) {
                mediaUrls.push(req.body[`MediaUrl${i}`]);
            }
        }
         const interactiveReplyId = Body || ButtonPayload; 


        // ETAPA 1: Processar respostas de botões/listas primeiro
         if (interactiveReplyId && interactiveReplyId.startsWith('rating_')) {
            console.log(`[SERVICE] Recebida avaliação via interactiveReplyId: ${interactiveReplyId}`);
            const parts = interactiveReplyId.split('_'); // Usamos a variável unificada
            const nota = parseInt(parts[1], 10);
            const orcamentoId = parts[2];
            
            // O resto da sua lógica de salvar a nota continua exatamente igual...
            const orcamento = await Orcamento.findById(orcamentoId);
            if (orcamento && !orcamento.notaSatisfacao) {
                orcamento.notaSatisfacao = nota;
                orcamento.historico.push({ evento: `Cliente avaliou o serviço com nota ${nota}.` });
                await orcamento.save();
                await sendWhatsAppMessage(senderPhone, 'Obrigado pelo seu feedback! 👍');
            } else if (orcamento && orcamento.notaSatisfacao) {
                // Opcional: Responder se o cliente tentar avaliar de novo
                await sendWhatsAppMessage(senderPhone, 'Este pedido já foi avaliado. Agradecemos novamente!');
            }
            return; // Importante para não continuar para a lógica de conversa
        }
        

        // ETAPA 2: Lógica de conversa normal
        let user = await Cliente.findOne({ telefone: senderPhone });

       if (!user) {
    const clienteNome = ProfileName || `Cliente ${senderPhone.slice(-4)}`;

    // ==========================================================
    // ==> LÓGICA DE COMPARAÇÃO FINAL E À PROVA DE FALHAS <==
    // ==========================================================
    // Limpa tudo o que não for um dígito numérico de ambos os números
    const numeroLimpoDoWhatsapp = senderPhone.replace(/\D/g, '');
    const numeroLimpoDoEnv = process.env.PRESTADOR_TELEFONE.replace(/\D/g, '');

    console.log('--- VERIFICAÇÃO FINAL ---');
    console.log(`Número Limpo do WhatsApp: |${numeroLimpoDoWhatsapp}|`);
    console.log(`Número Limpo do .env:     |${numeroLimpoDoEnv}|`);
    
    const isPrestador = (numeroLimpoDoWhatsapp === numeroLimpoDoEnv);
    console.log('São iguais?', isPrestador);
    console.log('---------------------------');
if (user && user.role === 'CLIENTE_FINAL' && user.conversationState === 'AWAITING_RATING') {
    const textoAvaliacao = (Body || '').trim();
    let nota = null;

    // Lógica inteligente para "entender" a nota do cliente
    if (textoAvaliacao.includes('⭐⭐⭐⭐⭐') || textoAvaliacao.match(/\b5\b/)) nota = 5;
    else if (textoAvaliacao.includes('⭐⭐⭐⭐') || textoAvaliacao.match(/\b4\b/)) nota = 4;
    else if (textoAvaliacao.includes('⭐⭐⭐') || textoAvaliacao.match(/\b3\b/)) nota = 3;
    else if (textoAvaliacao.includes('⭐⭐') || textoAvaliacao.match(/\b2\b/)) nota = 2;
    else if (textoAvaliacao.includes('⭐') || textoAvaliacao.match(/\b1\b/)) nota = 1;

    if (nota !== null && user.pendingRating && user.pendingRating.orcamentoId) {
        // Encontrámos a nota E sabemos qual pedido avaliar!
        const orcamentoId = user.pendingRating.orcamentoId;
        const orcamento = await Orcamento.findById(orcamentoId);

        if (orcamento) {
            orcamento.notaSatisfacao = nota;
            orcamento.historico.push({ evento: `Cliente avaliou o serviço com nota ${nota} via WhatsApp.` });
            await orcamento.save();
            await sendWhatsAppMessage(senderPhone, 'Obrigado pelo seu feedback! 👍');
        }

        // Limpa o estado e volta a conversa ao normal
        user.conversationState = 'AWAITING_REQUEST_TYPE';
        user.pendingRating = {};
        await user.save();

    } else {
        // Não entendeu a nota, pede para tentar de novo
        await sendWhatsAppMessage(senderPhone, 'Não entendi a sua avaliação. Por favor, escolha uma das opções da lista ou envie um número de 1 a 5.');
    }
    
    return; // ESSENCIAL: Interrompe o resto da execução para não enviar o menu principal
}

    if (isPrestador) {
        console.log(`[SERVICE] Número ${senderPhone} identificado como PRESTADOR.`);
        user = new Cliente({
            nome: "Prestador Principal",
            telefone: senderPhone,
            role: 'PRESTADOR',
            conversationState: 'NONE'
        });
        await user.save();
        await sendWhatsAppMessage(senderPhone, "Modo de comando ativado. Para ver a lista de comandos, envie 'ajuda'.");
    } else {
        console.log(`[SERVICE] Criando novo cliente para o número: ${senderPhone}`);
        user = new Cliente({
            nome: clienteNome,
            telefone: senderPhone,
            role: 'CLIENTE_FINAL',
            conversationState: 'AWAITING_REQUEST_TYPE'
        });
        await user.save();
        const welcomeMessage = `Olá, ${clienteNome}! Bem-vindo(a) ao Faz&Resolve.\n\nComo podemos ajudar hoje?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente\n\n(A qualquer momento, envie *voltar* para ir ao passo anterior).`;
        await sendWhatsAppMessage(senderPhone, welcomeMessage);
    }
    return; // Encerra a execução aqui, pois o resto do fluxo é para mensagens seguintes.
}

        if (user.role === 'PRESTADOR') {
            const responseMessage = await commandParser.parseAndExecute(messageBody, user, sendWhatsAppMessage);
            if (responseMessage) { await sendWhatsAppMessage(user.telefone, responseMessage); }
        } else { // Role: 'CLIENTE_FINAL'
              // Lógica para guardar a mensagem na conversa
    if (messageBody || mediaUrls.length > 0) {
        const conversa = await Conversa.findOneAndUpdate(
            { cliente: user._id }, // Encontra a conversa pelo ID do cliente
            { 
                $push: { 
                    mensagens: { 
                        remetente: 'cliente', 
                        texto: messageBody,
                        // Pega apenas a primeira imagem, se houver
                        mediaUrl: mediaUrls.length > 0 ? mediaUrls[0] : undefined 
                    } 
                },
                lidaPeloPrestador: false // Marca como não lida
            },
            { 
                upsert: true, // Se a conversa não existir, cria uma nova
                new: true,
                // Assumindo que você tem o ID do prestador. No seu código atual, ele parece ser global.
                // Se não, você precisará encontrá-lo primeiro.
                // setOnInsert: { prestador: ID_DO_PRESTADOR_AQUI } 
            }
        );
    }
            const clientCommand = messageBody.toLowerCase().trim();
            if (clientCommand === 'voltar') {
                let previousState = 'AWAITING_REQUEST_TYPE';
                let replyMessage = '';
                switch (user.conversationState) {
                    case 'AWAITING_SERVICE_TYPE':
                        replyMessage = "Ok, voltamos ao menu principal. Como podemos ajudar?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente";
                        user.currentDemand = {};
                        break;
                    case 'AWAITING_ADDRESS':
                        previousState = 'AWAITING_SERVICE_TYPE';
                        replyMessage = "Ok, voltamos ao passo anterior. Por favor, descreva novamente o serviço que precisa.";
                        break;
                    case 'AWAITING_AVAILABILITY':
                        previousState = 'AWAITING_ADDRESS';
                        replyMessage = "Certo, voltamos um passo. Por favor, informe novamente o seu endereço.";
                        break;
                    default:
                        await sendWhatsAppMessage(user.telefone, "Você já está no menu principal. Não é possível voltar mais.");
                        return;
                }
                user.conversationState = previousState;
                await user.save();
                await sendWhatsAppMessage(user.telefone, replyMessage);
                return;
            }

            if (clientCommand === 'meu pedido' || clientCommand === 'status') {
                const statusResponse = await handleCheckOrderStatus(user);
                await sendWhatsAppMessage(user.telefone, statusResponse);
                return;
            }

            switch (user.conversationState) {
                case 'AWAITING_REQUEST_TYPE':
                    const option = messageBody.trim();
                    if (option === '1') {
                        user.currentDemand = { requestType: 'NOVO_SERVICO' };
                        user.conversationState = 'AWAITING_SERVICE_TYPE';
                        await user.save();
                        await sendWhatsAppMessage(user.telefone, "Com certeza! Para começarmos, por favor, descreva em detalhe o que você precisa. Se quiser, pode também enviar fotos ou vídeos do item.\n\n(Envie *voltar* para cancelar e retornar ao menu).");
                    } else if (option === '2') {
                        const statusResponse = await handleCheckOrderStatus(user);
                        await sendWhatsAppMessage(user.telefone, statusResponse);
                    } else if (option === '3') {
                        await sendWhatsAppMessage(user.telefone, "Entendido. A sua solicitação foi enviada. Um dos nossos atendentes irá entrar em contato consigo nesta conversa em breve.");
                        if (prestadorPhone) {
                            const clientPhoneNumber = user.telefone.replace(/\D/g, '');
                            const whatsappLink = `https://wa.me/${clientPhoneNumber}`;
                            const notificationToPrestador = `🔔 *Atenção: Cliente precisa de ajuda!*\n\nO cliente *${user.nome}* (${user.telefone}) solicitou falar com um atendente.\n\nClique aqui para abrir a conversa: ${whatsappLink}`;
                            await sendWhatsAppMessage(prestadorPhone, notificationToPrestador);
                        } else {
                            console.error("ALERTA: PRESTADOR_TELEFONE não definido no .env. Não foi possível notificar.");
                        }
                    } else {
                        const newRequestMessage = `Olá, ${user.nome}! Não entendi a sua resposta. Por favor, escolha uma das opções:\n\n*1.* Pedir um novo serviço\n*2.* Saber o estado de um serviço\n*3.* Falar com um atendente`;
                        await sendWhatsAppMessage(user.telefone, newRequestMessage);
                    }
                    break;
                
                case 'AWAITING_ORDER_SELECTION':
                    const match = messageBody.toLowerCase().trim().match(/^(?:ver\s+)?pedido\s+(\d+)$/);
                    if (!match) {
                        await sendWhatsAppMessage(user.telefone, "Comando não entendido. Por favor, responda no formato `ver pedido [NÚMERO]`.");
                        return;
                    }
                    const selectedIndex = parseInt(match[1]) - 1;
                    const pendingOrderIds = user.currentDemand.pendingOrderIds;
                    if (pendingOrderIds && selectedIndex >= 0 && selectedIndex < pendingOrderIds.length) {
                        const selectedOrderId = pendingOrderIds[selectedIndex];
                        const selectedOrder = await Orcamento.findById(selectedOrderId);
                        let statusMessage = `Detalhes do pedido *#${selectedOrder.shortId}*:\n\n*Descrição:* ${selectedOrder.descricao.slice(0, 50)}...\n*Estado Atual:* ${selectedOrder.status}\n\n`;
                        if (selectedOrder.status === 'Agendado') { statusMessage += `Ele está confirmado para a data: *${selectedOrder.dataAgendamento}*.`; }
                        else if (selectedOrder.status === 'Aceito') { statusMessage += `O seu orçamento de R$ ${selectedOrder.valorProposto.toFixed(2)} foi aceite. Em breve, entraremos em contato para agendar.`; }
                        else { statusMessage += `A sua solicitação está na nossa fila para análise.`; }
                        await sendWhatsAppMessage(user.telefone, statusMessage);
                    } else {
                        await sendWhatsAppMessage(user.telefone, "Seleção inválida. O número que você enviou não corresponde a nenhum pedido da lista.");
                    }
                    user.conversationState = 'AWAITING_REQUEST_TYPE';
                    user.currentDemand = {};
                    await user.save();
                    break;

                case 'AWAITING_SERVICE_TYPE': 
                    user.currentDemand = user.currentDemand || {};
                    user.currentDemand.description = messageBody;
                    if (mediaUrls && mediaUrls.length > 0) {
                        user.currentDemand.media = mediaUrls.map(url => ({ url: url, sid: url.split('/').pop() }));
                    }
                    user.conversationState = 'AWAITING_CEP'; // Próximo passo: pedir o CEP
        await user.save();
        await sendWhatsAppMessage(user.telefone, "Descrição recebida! 👍\n\nPara agilizar, por favor, digite o seu *CEP* (apenas números, ex: 18270000).");
        break;

       case 'AWAITING_CEP':
    const cepRegex = /^\d{5}-?\d{3}$/;
    if (!cepRegex.test(messageBody.trim())) {
        await sendWhatsAppMessage(user.telefone, "CEP inválido. Por favor, envie um CEP válido, como `18270-000` ou `18270000`.");
        return;
    }
    
    try {
        const cepLimpo = messageBody.replace(/\D/g, '');
        const { data } = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);

        if (data.erro) {
            await sendWhatsAppMessage(user.telefone, 'CEP não encontrado. Por favor, verifique e envie novamente.');
            return;
        }
        
        // Guarda os dados temporários
        user.currentDemand.addressData = {
            rua: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf,
        };
        
        // Muda para o próximo estado
        user.conversationState = 'AWAITING_NUMERO';
        await user.save();
        
        // --- A RESPOSTA QUE ESTAVA EM FALTA ---
        // Agora, o bot envia a próxima pergunta ao utilizador.
        const proximaPergunta = `Encontrei o endereço: ${data.logradouro}, ${data.bairro}.\n\nPor favor, envie agora o *número da sua casa* e o complemento (se houver). Ex: *123, Apartamento 4B*`;
        await sendWhatsAppMessage(user.telefone, proximaPergunta);
        // ------------------------------------

    } catch (error) {
        console.error("Erro ao consultar o CEP:", error);
        await sendWhatsAppMessage(user.telefone, 'Ocorreu um erro ao consultar o seu CEP. Por favor, tente novamente.');
    }
    break;
         case 'AWAITING_NUMERO':
                    // --- CORREÇÃO DE SEGURANÇA DEFINITIVA ---
                    if (!user.currentDemand || !user.currentDemand.addressData || !user.currentDemand.addressData.rua) {
                        await sendWhatsAppMessage(user.telefone, "Ops, parece que me perdi. Poderia, por favor, enviar o seu CEP novamente para eu encontrar o seu endereço?");
                        user.conversationState = 'AWAITING_CEP'; // Reinicia o fluxo a partir do CEP
                        await user.save();
                        return; // Interrompe a execução
                    }

                    // Se a verificação passar, o código continua com segurança
                    const { rua, bairro, cidade, uf } = user.currentDemand.addressData;
                    const numeroEComplemento = messageBody;
                    const enderecoCompleto = `${rua}, ${numeroEComplemento}, ${bairro}, ${cidade} - ${uf}`;
                    
                    user.currentDemand.address = enderecoCompleto;
                    user.conversationState = 'AWAITING_AVAILABILITY';
                    await user.save();

                    await sendWhatsAppMessage(user.telefone, "Endereço anotado. Para finalizar, por favor, diga-nos qual a melhor data e período para si (ex: 'amanhã à tarde', 'sábado de manhã').");
                    break;


                // CÓDIGO CORRIGIDO E INTELIGENTE
case 'AWAITING_AVAILABILITY':
    // 1. Tenta "entender" a data e hora que o cliente enviou.
    // Usamos o chrono-node para extrair a data do texto.
    // A opção forwardDate garante que ele não pegue uma data no passado (ex: se hoje é dia 20 e o cliente diz "dia 18", ele entende que é do próximo mês).
    const dataParseada = chrono.pt.parseDate(messageBody, new Date(), { forwardDate: true });

    // 2. Se não entender a data, pede para o cliente tentar de novo.
    if (!dataParseada) {
        // A data é inválida! Não mudamos o estado da conversa.
        // Apenas enviamos uma mensagem pedindo para tentar novamente.
        await sendWhatsAppMessage(
            user.telefone,
            "Desculpe, não consegui entender a data que você informou. 🤔\n\nPoderia tentar de novo? Por favor, use um formato claro, como:\n\n• *18/07/2025 às 14:30*\n• *amanhã de manhã*\n• *sexta-feira ao meio-dia*"
        );
        // O break aqui interrompe e espera a próxima mensagem do cliente,
        // ainda no estado AWAITING_AVAILABILITY.
        break; 
    }

    // 3. Se a data for válida, prossegue com a criação do pedido.
    // Se chegamos aqui, 'dataParseada' é um objeto Date válido!
    user.conversationState = 'COMPLETED'; // Agora sim, mudamos o estado.
    
     const newOrcamento = await Orcamento.create({
                        cliente: user._id,
                        tipo: 'ORCAMENTO',
                        status: 'Pendente', // 1. O status agora é 'Pendente', como deveria ser.
                        descricao: user.currentDemand.description,
                        media: user.currentDemand.media,
                        address: user.currentDemand.address,
                        sugestaoAgendamentoCliente: dataParseada, // 2. A data é guardada como uma SUGESTÃO.
                        historico: [{ evento: 'Pedido criado pelo cliente via WhatsApp.' }]
                    });

    user.currentDemand = {}; // Limpa a demanda atual
    await user.save();
    
    // Envia a confirmação para o cliente, com a data formatada corretamente.
    await sendWhatsAppMessage(user.telefone, "Tudo certo! A sua solicitação foi registada com sucesso. Entraremos em contato em breve para confirmar.\n\nObrigado por usar o Faz & Resolve!");

    // Notifica o prestador sobre o novo pedido.
    const prestadorPhone = process.env.PRESTADOR_TELEFONE;
    if(prestadorPhone) {
        // Usamos .toLocaleString para mostrar a data de forma amigável para o prestador.
        const dataFormatada = dataParseada.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        const notificationToPrestador = `🔔 *Novo Pedido Recebido!* (#${newOrcamento.shortId})\n\n` +
                                      `*Cliente:* ${user.nome}\n` +
                                      `*Descrição:* ${newOrcamento.descricao.slice(0, 80)}...\n` +
                                      `*Sugestão de Data:* ${dataFormatada}\n\n` +
                                      `Para ver todos os detalhes, envie: \`ver ${newOrcamento.shortId}\``;
        await sendWhatsAppMessage(prestadorPhone, notificationToPrestador);
    }
    break;
                    
                
                case 'COMPLETED':
                    const completedReply = `Olá! O seu último pedido já foi registado. Para iniciar uma nova solicitação, escolha uma das opções abaixo.`;
                    await sendWhatsAppMessage(user.telefone, completedReply);
                    user.conversationState = 'AWAITING_REQUEST_TYPE';
                    await user.save();
                    const newRequestMessage = `Como podemos ajudar hoje?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente`;
                    await sendWhatsAppMessage(user.telefone, newRequestMessage);
                    break;
                
                default:
                    user.conversationState = 'AWAITING_REQUEST_TYPE';
                    await user.save();
                    await sendWhatsAppMessage(user.telefone, "Ocorreu um erro, vamos recomeçar. Como podemos ajudar?\n\n*1.* Pedir um novo serviço ou orçamento\n*2.* Saber o estado de um serviço em andamento\n*3.* Falar com um atendente");
                    break;
            }
        }
    } catch (error) {
        console.error("[SERVICE] ERRO GERAL NO HANDLEINCOMINGMESSAGE:", error);
    }
};

// =======================================================
// SEÇÃO DE CRUD PARA TEMPLATES
// =======================================================
//const WhatsappTemplate = require('../models/whatsappTemplate.model.js');
//const Orcamento = require('../models/orcamento.model.js');
//const Cliente = require('../models/cliente.model.js');

// Classe de erro customizada para facilitar o tratamento no controller
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}

const findAllTemplates = async () => {
    return await WhatsappTemplate.find();
};

const createTemplate = async (templateData) => {
    return await WhatsappTemplate.create(templateData);
};

const updateTemplate = async (id, templateData) => {
    return await WhatsappTemplate.findByIdAndUpdate(id, templateData, { new: true });
};

const deleteTemplate = async (id) => {
    return await WhatsappTemplate.findByIdAndDelete(id);
};

// =======================================================
// SEÇÃO DE RENDERIZAÇÃO DE TEMPLATES
// =======================================================
const orcamentoService = require('./orcamento.service'); // Importa o serviço de orçamento

const renderTemplateMessage = async (templateId, orcamentoId) => {
    const template = await WhatsappTemplate.findById(templateId);
    if (!template) {
        throw new NotFoundError('Template não encontrado.');
    }

    let orcamento = await Orcamento.findById(orcamentoId).populate('cliente');
    if (!orcamento || !orcamento.cliente) {
        throw new NotFoundError('Orçamento ou cliente associado não encontrado.');
    }

    const prestador = await Cliente.findById(orcamento.prestadorId);
    if (!prestador) {
        throw new NotFoundError('Prestador do orçamento não encontrado.');
    }
    
    const cliente = orcamento.cliente;
    let mensagemFinal = template.mensagem;

    // Lógica de Pagamento Dinâmica
    if (prestador.metodoRecebimento === 'MERCADOPAGO') {
        // Gera o link de pagamento se não existir
        if (!orcamento.linkPagamento) {
            orcamento = await orcamentoService.gerarLinkPagamentoMercadoPago(orcamentoId, prestador._id.toString());
        }
        mensagemFinal = mensagemFinal.replace(/{{link_pagamento}}/g, orcamento.linkPagamento);
    } else { // MANUAL
        mensagemFinal = mensagemFinal.replace(/{{chave_pix_prestador}}/g, prestador.chavePixManual || 'Chave Pix não configurada');
    }

    // Lógica de substituição dos placeholders
    mensagemFinal = mensagemFinal.replace(/{{cliente.nome}}/g, cliente.nome);
    mensagemFinal = mensagemFinal.replace(/{{cliente.telefone}}/g, cliente.telefone);
    mensagemFinal = mensagemFinal.replace(/{{orcamento.descricao}}/g, orcamento.descricao);

    // Calcula o valor pendente
    const totalPago = orcamento.pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const valorPendente = (orcamento.valorProposto || 0) - totalPago;

    mensagemFinal = mensagemFinal.replace(/{{orcamento.valorProposto}}/g, orcamento.valorProposto ? orcamento.valorProposto.toFixed(2) : 'N/A');
    mensagemFinal = mensagemFinal.replace(/{{orcamento.valorPendente}}/g, valorPendente.toFixed(2));

    mensagemFinal = mensagemFinal.replace(/{{orcamento.dataAgendamento}}/g, orcamento.dataAgendamento ? new Date(orcamento.dataAgendamento).toLocaleDateString('pt-BR') : 'N/A');
    mensagemFinal = mensagemFinal.replace(/{{orcamento.shortId}}/g, orcamento.shortId);

    return {
        numeroDoCliente: cliente.telefone,
        mensagemFinal: mensagemFinal
    };
};


// =======================================================
// EXPORTANDO AS FUNÇÕES CORRETAMENTE
// =======================================================
module.exports = {
    handleIncomingMessage,
    sendWhatsAppMessage,
    sendSatisfactionSurvey,
    findAllTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    renderTemplateMessage,
     renderTemplate
};