const PLANS = [
    {
        id: '30cf84763da1405d812d8c99a6935683',
        name: 'Essencial',
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
        id: 'ae12c6210aac4f72a09a4766fb693117',
        name: 'Profissional',
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
        id: '7c8408f9ead94a2abfc4a0b92b0225f2',
        name: 'Premium',
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
