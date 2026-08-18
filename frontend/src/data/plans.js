// src/data/plans.js

const calculatePrice = (basePrice, months, discount) => {
    const total = basePrice * months * (1 - discount);
    return total.toFixed(2);
};

export const planos = [
    {
        id: '6b091fbd112d424db659ff4518124f92',
        nome: 'Essencial',
        preco: '79.99',
        features: ['Gestão de Pedidos', 'Portal do Cliente', 'Gestão de Clientes', 'Limite de 1 Utilizador'],
        durations: [
            { months: 1, discount: 0, price: calculatePrice(79.99, 1, 0), priceId: 'price_1' },
            { months: 6, discount: 0.10, price: calculatePrice(79.99, 6, 0.10), priceId: 'price_2' },
            { months: 12, discount: 0.20, price: calculatePrice(79.99, 12, 0.20), priceId: 'price_3' },
        ],
    },
    {
        id: '9e9933a8c7cb4e4f9e31559f958db1de',
        nome: 'Profissional',
        preco: '129.99',
        popular: true,
        features: ['Tudo do Essencial', 'Gestão de Estoque', 'Integração Google Calendar', 'Limite de 2 Utilizadores'],
        durations: [
            { months: 1, discount: 0, price: calculatePrice(129.99, 1, 0), priceId: 'price_4' },
            { months: 6, discount: 0.10, price: calculatePrice(129.99, 6, 0.10), priceId: 'price_5' },
            { months: 12, discount: 0.20, price: calculatePrice(129.99, 12, 0.20), priceId: 'price_6' },
        ],
    },
    {
        id: '1db788e04d7540a9a7055b7b61bddfe4',
        nome: 'Premium',
        preco: '199.99',
        features: ['Tudo do Profissional', 'Estoque Inteligente com IA', 'Automação WhatsApp', 'Limite de 5 Utilizadores'],
        durations: [
            { months: 1, discount: 0, price: calculatePrice(199.99, 1, 0), priceId: 'price_7' },
            { months: 6, discount: 0.10, price: calculatePrice(199.99, 6, 0.10), priceId: 'price_8' },
            { months: 12, discount: 0.20, price: calculatePrice(199.99, 12, 0.20), priceId: 'price_9' },
        ],
    }
];
