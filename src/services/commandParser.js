// Arquivo: src/services/commandParser.js

// Usamos a biblioteca date-fns para interpretar datas como "amanhã 14h"
// Instala-a com: npm install date-fns
const { parse, addDays, set } = require('date-fns');

const parseCommand = (message) => {
    const text = message.toLowerCase().trim();

    // Tenta encontrar padrões conhecidos na mensagem
    
    // Padrão: aceitar [id] valor [valor] validade [dias]
    const aceitarMatch = text.match(/^aceitar (\w+)(?: valor ([\d,.]+))?(?: validade (\d+) dias?)?/);
    if (aceitarMatch) {
        return {
            command: 'ACEITAR_ORCAMENTO',
            orcamentoId: aceitarMatch[1],
            valor: parseFloat(aceitarMatch[2]?.replace(',', '.')) || null,
            validadeDias: parseInt(aceitarMatch[3]) || null
        };
    }

    // Padrão: agendar [id] para [data/hora]
    const agendarMatch = text.match(/^agendar (\w+) para (.+)/);
    if (agendarMatch) {
        // Lógica simples para interpretar a data. Pode ser melhorada.
        let dataAgendamento;
        const textoData = agendarMatch[2];
        if (textoData.includes('amanha')) {
            const timeMatch = textoData.match(/(\d{1,2})h(?:(\d{1,2}))?/);
            const hours = timeMatch ? parseInt(timeMatch[1]) : 9;
            const minutes = timeMatch ? parseInt(timeMatch[2] || '0') : 0;
            let date = addDays(new Date(), 1);
            date = set(date, { hours, minutes, seconds: 0 });
            dataAgendamento = date;
        }
        // Adicionar mais lógicas de data aqui (ex: "dia 30 às 15h")

        return {
            command: 'AGENDAR_SERVICO',
            orcamentoId: agendarMatch[1],
            data: dataAgendamento
        };
    }

    // Padrão: finalizar [id]
    const finalizarMatch = text.match(/^finalizar (\w+)/);
    if (finalizarMatch) {
        return {
            command: 'FINALIZAR_SERVICO',
            orcamentoId: finalizarMatch[1]
        };
    }

    // Se nenhum comando for reconhecido
    return null;
};

module.exports = {
    parseCommand
};
