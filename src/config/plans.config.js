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
        permissions: [
            'ver_dashboard', 
            'ver_agenda', 
            'editar_agenda', 
            'ver_clientes', 
            'editar_clientes', 
            'ver_orcamentos', 
            'editar_orcamentos', 
            'ver_financeiro'
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
        permissions: [
            'ver_dashboard', 
            'ver_agenda', 
            'editar_agenda', 
            'ver_clientes', 
            'editar_clientes', 
            'ver_orcamentos', 
            'editar_orcamentos', 
            'ver_financeiro'
        ]
    }
];

module.exports = PLANS;