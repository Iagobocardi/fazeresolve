// src/config/plans.config.js

/**
 * Mapeamento central de permissões por nível de plano.
 * Isso evita a repetição da lista de permissões para cada variação de plano (mensal, anual, etc.).
 */
const PLAN_PERMISSIONS = {
    'Essencial': [
        'ver_dashboard', 
        'ver_agenda', 
        'editar_agenda', 
        'ver_clientes', 
        'editar_clientes', 
        'ver_orcamentos'
    ],
    'Profissional': [
        'ver_dashboard',
        'ver_agenda',
        'editar_agenda',
        'ver_clientes',
        'editar_clientes',
        'ver_orcamentos',
        'editar_orcamentos',
        'ver_financeiro',
        'usar_catalogo_inteligente',
        'gerenciar_modelos_servico'
    ],
    'Premium': [
        'ver_dashboard',
        'ver_agenda',
        'editar_agenda',
        'ver_clientes',
        'editar_clientes',
        'ver_orcamentos',
        'editar_orcamentos',
        'ver_financeiro',
        'usar_catalogo_inteligente',
        'gerenciar_modelos_servico',
        // Adicionar permissões futuras do Premium aqui
    ]
};

/**
 * Lista unificada de todos os produtos compráveis (assinaturas e pacotes).
 * Esta estrutura de dados plana foi projetada para corresponder diretamente
 * aos requisitos do novo componente de faturamento do frontend.
 */
const PLANS = [
    // === ASSINATURAS RECORRENTES ===

    // --- Essencial ---
    { 
        id: 'essencial_mensal', 
        mercadoPagoPlanId: '30cf84763da1405d812d8c99a6935683', // ID do plano no gateway
        nome: 'Essencial', 
        tipo: 'assinatura', 
        ciclo: 'mensal', 
        precoValor: 79, 
        precoTexto: 'R$ 79', 
        beneficios: ['Gestão de Clientes e Serviços', 'Agenda', 'Orçamentos', '1 Usuário'],
        permissions: PLAN_PERMISSIONS['Essencial']
    },
    { 
        id: 'essencial_anual', 
        mercadoPagoPlanId: '660696cc47e047ce8cf5033e92dd3b95',
        nome: 'Essencial', 
        tipo: 'assinatura', 
        ciclo: 'anual', 
        precoValor: 790, 
        precoTexto: 'R$ 790', 
        beneficios: ['Tudo do Mensal', 'Desconto de 20%'],
        permissions: PLAN_PERMISSIONS['Essencial']
    },
    // --- Profissional ---
    { 
        id: 'prof_mensal', 
        mercadoPagoPlanId: 'ae12c6210aac4f72a09a4766fb693117',
        nome: 'Profissional', 
        tipo: 'assinatura', 
        ciclo: 'mensal', 
        precoValor: 129, 
        precoTexto: 'R$ 129', 
        beneficios: ['Tudo do Essencial', 'Financeiro', 'Estoque', '2 Usuários'],
        permissions: PLAN_PERMISSIONS['Profissional']
    },
    { 
        id: 'prof_anual', 
        mercadoPagoPlanId: '179d53b0bd4340db8aab22dc9c4c65fc',
        nome: 'Profissional', 
        tipo: 'assinatura', 
        ciclo: 'anual', 
        precoValor: 1290, 
        precoTexto: 'R$ 1290', 
        beneficios: ['Tudo do Mensal', 'Desconto de 20%'],
        permissions: PLAN_PERMISSIONS['Profissional']
    },
    // --- Premium ---
    { 
        id: 'premium_mensal', 
        mercadoPagoPlanId: '7c8408f9ead94a2abfc4a0b92b0225f2',
        nome: 'Premium', 
        tipo: 'assinatura', 
        ciclo: 'mensal', 
        precoValor: 199, 
        precoTexto: 'R$ 199', 
        beneficios: ['Tudo do Profissional', 'Estoque IA', 'Mapa Demanda', '5 Usuários'],
        permissions: PLAN_PERMISSIONS['Premium']
    },
    { 
        id: 'premium_anual', 
        mercadoPagoPlanId: '1b2f16ce5d0241c0bcb2952f29f6748b',
        nome: 'Premium', 
        tipo: 'assinatura', 
        ciclo: 'anual', 
        precoValor: 1990, 
        precoTexto: 'R$ 1990', 
        beneficios: ['Tudo do Mensal', 'Desconto de 20%'],
        permissions: PLAN_PERMISSIONS['Premium']
    },
    
    // === PACOTES PRÉ-PAGOS (ONETIME) ===

    // --- Pacotes Essencial ---
    { id: 'onetime_essencial_1', nome: 'Essencial', tipo: 'pacote', meses: 1, precoValor: 89, precoTexto: 'R$ 89', beneficios: ['Acesso por 1 Mês', 'Gestão de Clientes e Serviços', 'Agenda', 'Orçamentos', '1 Usuário'], permissions: PLAN_PERMISSIONS['Essencial'] },
    { id: 'onetime_essencial_3', nome: 'Essencial', tipo: 'pacote', meses: 3, precoValor: 250, precoTexto: 'R$ 250', beneficios: ['Acesso por 3 Meses', 'Todas func. Essencial'], permissions: PLAN_PERMISSIONS['Essencial'] },
    { id: 'onetime_essencial_6', nome: 'Essencial', tipo: 'pacote', meses: 6, precoValor: 480, precoTexto: 'R$ 480', beneficios: ['Acesso por 6 Meses', 'Todas func. Essencial'], permissions: PLAN_PERMISSIONS['Essencial'] },
    { id: 'onetime_essencial_12', nome: 'Essencial', tipo: 'pacote', meses: 12, precoValor: 900, precoTexto: 'R$ 900', beneficios: ['Acesso por 12 Meses', 'Todas func. Essencial'], permissions: PLAN_PERMISSIONS['Essencial'] },
    // --- Pacotes Profissional ---
    { id: 'onetime_profissional_1', nome: 'Profissional', tipo: 'pacote', meses: 1, precoValor: 139, precoTexto: 'R$ 139', beneficios: ['Acesso por 1 Mês', 'Func. Essencial +', 'Financeiro', 'Estoque', '2 Usuários'], permissions: PLAN_PERMISSIONS['Profissional'] },
    { id: 'onetime_profissional_3', nome: 'Profissional', tipo: 'pacote', meses: 3, precoValor: 390, precoTexto: 'R$ 390', beneficios: ['Acesso por 3 Meses', 'Todas func. Profissional'], permissions: PLAN_PERMISSIONS['Profissional'] },
    { id: 'onetime_profissional_6', nome: 'Profissional', tipo: 'pacote', meses: 6, precoValor: 750, precoTexto: 'R$ 750', beneficios: ['Acesso por 6 Meses', 'Todas func. Profissional'], permissions: PLAN_PERMISSIONS['Profissional'] },
    { id: 'onetime_profissional_12', nome: 'Profissional', tipo: 'pacote', meses: 12, precoValor: 1400, precoTexto: 'R$ 1400', beneficios: ['Acesso por 12 Meses', 'Todas func. Profissional'], permissions: PLAN_PERMISSIONS['Profissional'] },
    // --- Pacotes Premium ---
    { id: 'onetime_premium_1', nome: 'Premium', tipo: 'pacote', meses: 1, precoValor: 210, precoTexto: 'R$ 210', beneficios: ['Acesso por 1 Mês', 'Func. Profissional +', 'Estoque IA', 'Mapa Demanda', '5 Usuários'], permissions: PLAN_PERMISSIONS['Premium'] },
    { id: 'onetime_premium_3', nome: 'Premium', tipo: 'pacote', meses: 3, precoValor: 600, precoTexto: 'R$ 600', beneficios: ['Acesso por 3 Meses', 'Todas func. Premium'], permissions: PLAN_PERMISSIONS['Premium'] },
    { id: 'onetime_premium_6', nome: 'Premium', tipo: 'pacote', meses: 6, precoValor: 1140, precoTexto: 'R$ 1140', beneficios: ['Acesso por 6 Meses', 'Todas func. Premium'], permissions: PLAN_PERMISSIONS['Premium'] },
    { id: 'onetime_premium_12', nome: 'Premium', tipo: 'pacote', meses: 12, precoValor: 2200, precoTexto: 'R$ 2200', beneficios: ['Acesso por 12 Meses', 'Todas func. Premium'], permissions: PLAN_PERMISSIONS['Premium'] },
];

module.exports = PLANS;
