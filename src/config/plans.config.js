const PLANS = [
    {
        id: '6b091fbd112d424db659ff4518124f92',
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
        id: '9e9933a8c7cb4e4f9e31559f958db1de',
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
        id: '1db788e04d7540a9a7055b7b61bddfe4',
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
