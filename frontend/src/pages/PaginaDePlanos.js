import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

// Static data for plans as per the new guide
export const PLANS = [
    {
        name: 'Essencial',
        description: 'Para quem está começando a organizar seus processos.',
        monthly: { id: '30cf84763da1405d812d8c99a6935683', price: '79' },
        annual: { id: '660696cc47e047ce8cf5033e92dd3b95', price: '790' },
        oneTime: [
            { id: 'onetime-essencial-1', price: '89', months: 1 },
            { id: 'onetime-essencial-3', price: '250', months: 3 },
            { id: 'onetime-essencial-6', price: '480', months: 6 },
            { id: 'onetime-essencial-12', price: '900', months: 12 },
        ],
        features: [
            'Gestão de Clientes e Serviços',
            'Agenda Inteligente',
            'Orçamentos e Pedidos',
            '1 Usuário',
        ],
        popular: false,
    },
    {
        name: 'Profissional',
        description: 'Para negócios em crescimento que buscam mais eficiência.',
        monthly: { id: 'ae12c6210aac4f72a09a4766fb693117', price: '129' },
        annual: { id: '179d53b0bd4340db8aab22dc9c4c65fc', price: '1290' },
        oneTime: [
            { id: 'onetime-profissional-1', price: '139', months: 1 },
            { id: 'onetime-profissional-3', price: '390', months: 3 },
            { id: 'onetime-profissional-6', price: '750', months: 6 },
            { id: 'onetime-profissional-12', price: '1400', months: 12 },
        ],
        features: [
            '<b>Tudo do Essencial, mais:</b>',
            'Relatórios Avançados',
            'Controle Financeiro Completo',
            'Gestão de Estoque',
            'Até 2 Usuários',
        ],
        popular: true,
    },
    {
        name: 'Premium',
        description: 'A solução completa para empresas que querem escalar.',
        monthly: { id: 'plan_premium_monthly', price: '199' }, // Placeholder ID
        annual: { id: 'plan_premium_annual', price: '1990' }, // Placeholder ID
        oneTime: [
            { id: 'onetime-premium-1', price: '219', months: 1 },
            { id: 'onetime-premium-3', price: '630', months: 3 },
            { id: 'onetime-premium-6', price: '1200', months: 6 },
            { id: 'onetime-premium-12', price: '2200', months: 12 },
        ],
        features: [
            '<b>Tudo do Profissional, mais:</b>',
            'Controle de Estoque com IA',
            'Mapa de Demanda (Analytics)',
            'Até 5 Usuários',
        ],
        popular: false,
    }
];

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const PlanDetailModal = ({ plano, onClose, onSelectPlan }) => {
    const [paymentType, setPaymentType] = useState('subscription');
    const [billingCycle, setBillingCycle] = useState('monthly');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-8">
                    <div className="flex justify-between items-start">
                        <h2 className="text-3xl font-bold text-slate-900">{plano.name}</h2>
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-3xl">&times;</button>
                    </div>
                    
                    <>
                        <p className="mt-2 text-slate-600">{plano.description}</p>
                        <div className="mt-6 flex justify-center bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setPaymentType('subscription')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition ${paymentType === 'subscription' ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}>Assinatura</button>
                            <button onClick={() => setPaymentType('onetime')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition ${paymentType === 'onetime' ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}>Pagamento Único</button>
                        </div>
                    </>

                    <div className="mt-6">
                        {/* Lógica de Assinatura */}
                        {paymentType === 'subscription' && (
                             <div className="space-y-4">
                                <div className="flex justify-center items-center space-x-4">
                                    <span className={`font-medium ${billingCycle === 'monthly' ? 'text-blue-600' : ''}`}>Mensal</span>
                                    <div className="relative inline-block w-14 h-8 cursor-pointer" onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}><div className="block bg-slate-200 w-full h-full rounded-full"></div><div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${billingCycle === 'annual' ? 'transform translate-x-6' : ''}`}></div></div>
                                    <span className={`font-medium ${billingCycle === 'annual' ? 'text-blue-600' : ''}`}>Anual <span className="text-green-500">(Economize)</span></span>
                                </div>
                                {billingCycle === 'monthly' && <div className="text-center p-4 border rounded-lg"><p className="text-4xl font-bold">R$ {plano.monthly.price}<span className="text-lg font-normal text-slate-500">/mês</span></p><button onClick={() => onSelectPlan(plano.monthly.id, 'subscription')} className="mt-4 w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600">Assinar plano Mensal</button></div>}
                                {billingCycle === 'annual' && <div className="text-center p-4 border rounded-lg"><p className="text-4xl font-bold">R$ {plano.annual.price}<span className="text-lg font-normal text-slate-500">/ano</span></p><button onClick={() => onSelectPlan(plano.annual.id, 'subscription')} className="mt-4 w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600">Assinar plano Anual</button></div>}
                            </div>
                        )}

                        {/* Pagamento único simplificado */}
                        {paymentType === 'onetime' && (
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-center text-slate-800">Escolha um pacote:</h3>
                                {plano.oneTime.map(pkg => (
                                    <button key={pkg.id} onClick={() => onSelectPlan(pkg.id, 'onetime')} className="w-full text-left p-4 border rounded-lg flex justify-between items-center hover:bg-slate-50 hover:border-blue-500 transition">
                                        <div><p className="font-semibold">{pkg.months} {pkg.months > 1 ? 'Meses' : 'Mês'} de Acesso</p><p className="text-sm text-slate-600">Pagamento único</p></div>
                                        <p className="text-xl font-bold">R$ {pkg.price}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const PaginaDePlanos = () => {
    const { usuario } = useAuth();
    const navigate = useNavigate();
    const [selectedPlan, setSelectedPlan] = useState(null);

    const handlePlanSelect = (plano) => {
        setSelectedPlan(plano);
    };

    const handleFinalSelection = (planId, paymentType) => {
        if (!planId || !paymentType) {
            toast.error("Seleção inválida. Tente novamente.");
            return;
        }

        if (usuario) {
            toast.error("Esta funcionalidade é apenas para novos usuários.");
            // Potencialmente redirecionar para uma página de upgrade
            return;
        }

        // Navega para a página de inscrição com os dados do plano
        navigate(`/subscribe?planoId=${planId}&paymentType=${paymentType}`);
    };

    return (
        <div className="bg-slate-50 text-slate-800 font-sans">
            <div className="container mx-auto px-4 py-16 sm:py-24">
                <div className="text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                        Planos transparentes para o seu negócio crescer.
                    </h1>
                    <p className="mt-6 text-lg text-slate-600">
                        Escolha o plano que melhor se adapta à sua fase. Sem surpresas na fatura.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12 max-w-6xl mx-auto">
                    {PLANS.map(plano => (
                        <div
                            key={plano.name}
                            className={`border rounded-2xl p-8 flex flex-col bg-white relative transition ${plano.popular ? 'border-2 border-blue-500 shadow-2xl shadow-blue-500/10' : 'border-slate-200'}`}
                        >
                            {plano.popular && <span className="absolute top-0 -translate-y-1/2 bg-blue-500 text-white font-semibold px-4 py-1 rounded-full text-sm">Mais Popular</span>}
                            <h3 className="text-2xl font-bold text-slate-900">{plano.name}</h3>
                            <p className="text-slate-500 mt-2">{plano.description}</p>
                            <div className="mt-6">
                                <p className="text-5xl font-bold tracking-tight">
                                    <span>R$ {plano.monthly.price}</span>
                                    <span className="text-lg font-medium text-slate-500">/mês</span>
                                </p>
                                <p className="text-sm text-slate-500">no plano mensal</p>
                            </div>
                            <ul className="mt-8 space-y-4 text-slate-600 flex-grow">
                                {plano.features.map(feature => <li key={feature} className="flex items-start"><CheckIcon /> <span dangerouslySetInnerHTML={{ __html: feature }} /></li>)}
                            </ul>
                            <button
                                onClick={() => handlePlanSelect(plano)}
                                className={`mt-8 w-full text-center font-semibold py-3 rounded-lg transition ${
                                    plano.popular
                                    ? 'bg-blue-500 border border-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                            >
                                Selecionar Plano
                            </button>
                        </div>
                    ))}
                </div>

                {selectedPlan && (
                    <PlanDetailModal
                        plano={selectedPlan}
                        onClose={() => setSelectedPlan(null)}
                        onSelectPlan={handleFinalSelection}
                    />
                )}
            </div>
        </div>
    );
};

export default PaginaDePlanos;
