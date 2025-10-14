const PLANS = [
    {
        name: 'Essencial',
        monthly: {
            id: '30cf84763da1405d812d8c99a6935683',
            price: '79'
        },
        annual: {
            id: '660696cc47e047ce8cf5033e92dd3b95',
            price: '790'
        },
        oneTime: [
            { id: 'onetime-essencial-1', price: '89', months: 1 },
            { id: 'onetime-essencial-3', price: '250', months: 3 },
            { id: 'onetime-essencial-6', price: '480', months: 6 },
            { id: 'onetime-essencial-12', price: '900', months: 12 },
        ],
        permissions: [
            'ver_dashboard', 
            'ver_agenda', 
            'editar_agenda', 
            'ver_clientes', 
            'editar_clientes', 
            'ver_orcamentos'
        ]
    },
    {
        name: 'Profissional',
        monthly: {
            id: 'ae12c6210aac4f72a09a4766fb693117',
            price: '129'
        },
        annual: {
            id: '179d53b0bd4340db8aab22dc9c4c65fc',
            price: '1290'
        },
        oneTime: [
            { id: 'onetime-profissional-1', price: '139', months: 1 },
            { id: 'onetime-profissional-3', price: '390', months: 3 },
            { id: 'onetime-profissional-6', price: '750', months: 6 },
            { id: 'onetime-profissional-12', price: '1400', months: 12 },
        ],
        permissions: [
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
        ]
    },
    {
        name: 'Premium',
        monthly: {
            id: '7c8408f9ead94a2abfc4a0b92b0225f2',
            price: '199'
        },
        annual: {
            id: '1b2f16ce5d0241c0bcb2952f29f6748b',
            price: '1990'
        },
        oneTime: [
            { id: 'onetime-premium-1', price: '210', months: 1 },
            { id: 'onetime-premium-3', price: '600', months: 3 },
            { id: 'onetime-premium-6', price: '1140', months: 6 },
            { id: 'onetime-premium-12', price: '2200', months: 12 },
        ],
        permissions: [
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
        ]
    }
];

module.exports = PLANS;
