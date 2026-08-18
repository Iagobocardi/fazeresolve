import { Wallet } from '@mercadopago/sdk-react';
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/apiClient';
import toast from 'react-hot-toast';
import FormularioAtualizacaoCartao from '../components/FormularioAtualizacaoCartao';

const ConfirmationModal = ({ modalConfig, onConfirm, onCancel }) => {
    if (!modalConfig.isOpen) return null;

    const confirmButtonClasses = `text-white font-bold px-6 py-2 rounded-lg ${modalConfig.confirmBg} ${modalConfig.confirmHover}`;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800">{modalConfig.title}</h3>
                    <p className="mt-4 text-slate-600">{modalConfig.message}</p>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-b-xl flex justify-end gap-3">
                    <button onClick={onCancel} className="bg-white border border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg hover:bg-slate-50">Cancelar</button>
                    <button onClick={onConfirm} className={confirmButtonClasses}>{modalConfig.confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const PaymentModal = ({ isOpen, onClose, onUpdateCard }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800">Atualizar Método de Pagamento</h3>
                    <div className="mt-4">
                        <FormularioAtualizacaoCartao onCardTokenReceived={onUpdateCard} />
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-b-xl text-right">
                    <button onClick={onClose} className="bg-white border border-slate-300 text-slate-700 font-semibold px-4 py-2 rounded-lg hover:bg-slate-50">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

const CheckoutModal = ({ preferenceId, onClose }) => {
    if (!preferenceId) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Finalize seu Pagamento</h3>
                <Wallet initialization={{ preferenceId }} />
                <button onClick={onClose} className="mt-4 w-full bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg">Fechar</button>
            </div>
        </div>
    );
};


const BillingPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedType, setSelectedType] = useState('assinatura');
    const [selectedCycle, setSelectedCycle] = useState('mensal');
    
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ isOpen: false });
    const [preferenceId, setPreferenceId] = useState(null);

    const location = useLocation();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/configuracoes/all-data');
            setData(response.data);
        } catch (err) {
            setError(err);
            toast.error("Falha ao carregar os dados. Tente novamente.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        const query = new URLSearchParams(location.search);
        if (query.get('payment_status') === 'success') {
            toast.success('Pagamento concluído com sucesso!');
        }
    }, [fetchData, location.search]);

    const handleActionConfirmation = (config) => {
        setModalConfig({ ...config, isOpen: true });
    };

    const resetModal = () => setModalConfig({ isOpen: false });

    const handleBuyPackage = async (planoId) => {
        resetModal();
        try {
            const response = await apiClient.post('/configuracoes/pacote/comprar', { planoId });
            setPreferenceId(response.data.preferenceId);
        } catch (error) {
            toast.error('Não foi possível iniciar a compra do pacote.');
        }
    };

    const handleChangePlan = async (planoId) => {
        resetModal();
        try {
            // Garante que o corpo da requisição seja exatamente { "planoId": "..." }
            await apiClient.post('/configuracoes/assinatura/alterar-plano', { planoId: planoId });
            toast.success('Plano alterado com sucesso!');
            await fetchData();
        } catch (error) {
            toast.error('Não foi possível alterar o plano.');
        }
    };

    const handleUpdateCard = async (cardTokenId) => {
        try {
            await apiClient.post('/configuracoes/assinatura/atualizar-pagamento', { cardTokenId });
            toast.success('Método de pagamento atualizado!');
            setIsPaymentModalOpen(false); // Close the modal on success
            await fetchData();
        } catch (error) {
            toast.error('Não foi possível atualizar o cartão.');
            // Optionally, keep the modal open on failure for the user to try again
        }
    };

    const handleCancelSubscription = async () => {
        resetModal();
        try {
            await apiClient.post('/configuracoes/assinatura/cancelar');
            toast.success('Assinatura cancelada com sucesso.');
            await fetchData();
        } catch (error) {
            toast.error('Não foi possível cancelar a assinatura.');
        }
    };

    if (loading) return <p>Carregando...</p>;
    if (error || !data) return <p>Falha ao carregar os dados.</p>;

    const { account_status, assinatura } = data;
    const isLocked = account_status === 'LOCKED';
    const isSubscription = assinatura.tipo === 'assinatura';
    const planoAtual = assinatura.planosDisponiveis.find(p => p.id === assinatura.planoAtualId);

    const getStatusBadgeClass = (status) => {
        if (status === 'Paga') return 'text-green-600';
        if (status === 'Falhou') return 'text-red-600';
        return 'text-yellow-600';
    };

    const renderPlanos = () => {
        const planosFiltrados = assinatura.planosDisponiveis.filter(p => {
            if (selectedType === 'assinatura') return p.tipo === 'assinatura' && p.ciclo === selectedCycle;
            return p.tipo === 'pacote';
        });

        if (selectedType === 'pacote') {
            const grouped = planosFiltrados.reduce((acc, p) => ({ ...acc, [p.nome]: [...(acc[p.nome] || []), p] }), {});
            return Object.keys(grouped).map(nome => (
                <div key={nome} className="border border-slate-200 rounded-2xl p-6 flex flex-col h-full bg-white">
                    <h3 className="text-lg font-bold text-blue-600">{nome} - Pacotes</h3>
                    <ul className="space-y-3 mt-4 flex-grow">
                        {grouped[nome].map(pacote => (
                            <li key={pacote.id} className="border-b pb-3 last:border-b-0">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{pacote.meses} Mês{pacote.meses > 1 ? 'es' : ''}</p>
                                        <p className="text-xl font-extrabold">{pacote.precoTexto}</p>
                                    </div>
                                    <button onClick={() => handleActionConfirmation({
                                        title: 'Comprar Acesso',
                                        message: `Confirmar a compra do pacote ${nome} por ${pacote.precoTexto}?`,
                                        confirmText: 'Confirmar Compra',
                                        confirmBg: 'bg-blue-500',
                                        confirmHover: 'hover:bg-blue-600',
                                        onConfirm: () => handleBuyPackage(pacote.id)
                                    })} disabled={isLocked} className="bg-white border border-primary-blue text-primary-blue font-semibold py-2 px-4 rounded-lg hover:bg-primary-blue hover:text-white text-sm disabled:opacity-50">
                                        Comprar
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            ));
        }

        return planosFiltrados.map(plano => {
            const isPlanoAtual = plano.id === assinatura.planoAtualId;
            return (
                <div key={plano.id} className={`border rounded-2xl p-6 flex flex-col h-full ${isPlanoAtual ? 'bg-blue-50 border-blue-300' : ''}`}>
                    <h3 className="text-lg font-bold text-blue-600">{plano.nome}</h3>
                    <p className="text-3xl font-extrabold my-4">{plano.precoTexto}<span className="text-base font-medium">/{selectedCycle === 'anual' ? 'ano' : 'mês'}</span></p>
                    <ul className="space-y-3 flex-grow">
                        {plano.beneficios.map((b, i) => <li key={i} className="flex items-start"><i className="fas fa-check text-blue-500 mr-2 mt-1"></i>{b}</li>)}
                    </ul>
                    <div className="mt-6">
                        {isPlanoAtual ? (
                            <button disabled className="w-full bg-slate-200 text-slate-600 font-semibold py-3 rounded-lg">Seu Plano Atual</button>
                        ) : (
                            <button onClick={() => handleActionConfirmation({
                                title: 'Alterar Plano',
                                message: `Confirmar a mudança para o plano ${plano.nome}?`,
                                confirmText: 'Confirmar Mudança',
                                confirmBg: 'bg-blue-500',
                                confirmHover: 'hover:bg-blue-600',
                                onConfirm: () => handleChangePlan(plano.id)
                            })} disabled={isLocked} className="w-full bg-white border border-primary-blue text-primary-blue font-semibold py-3 rounded-lg hover:bg-primary-blue hover:text-white disabled:opacity-50">
                                Mudar para {plano.nome}
                            </button>
                        )}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="container mx-auto max-w-5xl">
            <ConfirmationModal modalConfig={modalConfig} onConfirm={modalConfig.onConfirm} onCancel={resetModal} />
            <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onUpdateCard={handleUpdateCard} />
            <CheckoutModal preferenceId={preferenceId} onClose={() => setPreferenceId(null)} />
            
            <header className="mb-8">
                <h1 className="text-3xl font-bold">Assinatura e Cobrança</h1>
                <p className="text-slate-500 mt-1">Gerencie seu plano e pagamentos.</p>
            </header>

            {isLocked && (
                <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-lg">
                    <div className="flex items-center gap-4">
                        <i className="fas fa-exclamation-triangle text-red-600 text-3xl"></i>
                        <div>
                            <h3 className="text-lg font-bold text-red-800">Acesso limitado</h3>
                            <p className="text-red-700">Problema no pagamento. Atualize seu método de pagamento para reativar sua conta.</p>
                        </div>
                    </div>
                    <button onClick={() => setIsPaymentModalOpen(true)} className="mt-4 bg-red-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-red-700">
                        Regularizar Pagamento
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl card-shadow">
                    <h2 className="text-xl font-bold mb-4">Meu Acesso Atual</h2>
                    <div className="space-y-4">
                        <div>
                            <span className="text-sm font-semibold text-slate-500">Tipo</span>
                            <p className="text-lg font-bold">{isSubscription ? `${planoAtual?.nome} (${assinatura.planoAtualCiclo})` : `${planoAtual?.nome} (${planoAtual?.meses} Meses)`}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <span className="text-sm font-semibold">Status</span>
                                <div className="mt-1"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getStatusBadgeClass(assinatura.status)}`}>{assinatura.status}</span></div>
                            </div>
                            <div>
                                <span className="text-sm font-semibold">Valor</span>
                                <p className="text-lg font-bold">{planoAtual?.precoTexto}</p>
                            </div>
                            <div>
                                <span className="text-sm font-semibold">{isSubscription ? 'Próxima Cobrança' : 'Válido Até'}</span>
                                <p className="text-lg font-bold">{new Date(isSubscription ? assinatura.proximaCobranca : assinatura.validade).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                    {isSubscription && (
                        <div className="border-t mt-6 pt-6 text-right">
                            <button onClick={() => handleActionConfirmation({
                                title: 'Cancelar Assinatura',
                                message: 'Seu acesso permanecerá ativo até o final do ciclo de cobrança atual. Confirma o cancelamento?',
                                confirmText: 'Sim, Cancelar',
                                confirmBg: 'bg-red-500',
                                confirmHover: 'hover:bg-red-600',
                                onConfirm: handleCancelSubscription
                            })} disabled={isLocked} className="bg-white border text-slate-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-slate-50 disabled:opacity-50">
                                Cancelar Assinatura
                            </button>
                        </div>
                    )}
                </div>

                {(isSubscription || isLocked) && (
                    <div className={`lg:col-span-1 bg-white p-6 rounded-xl card-shadow ${isLocked ? 'ring-2 ring-red-500' : ''}`}>
                        <h2 className="text-xl font-bold mb-4">Método de Pagamento</h2>
                        <p className="text-xs text-slate-500 mb-4">Usado para a cobrança da sua assinatura.</p>
                        <div className="mb-4">
                            {assinatura.metodoPagamento ? (
                                <div className="flex items-center gap-3">
                                    <i className={`fab fa-cc-${assinatura.metodoPagamento.brand.toLowerCase()} text-4xl`}></i>
                                    <div>
                                        <p className="font-bold">Final ●●●● {assinatura.metodoPagamento.last4}</p>
                                        <p className="text-sm text-slate-500">{assinatura.metodoPagamento.brand}</p>
                                    </div>
                                </div>
                            ) : <p>Nenhum método cadastrado.</p>}
                        </div>
                        <button onClick={() => setIsPaymentModalOpen(true)} className="w-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold px-5 py-2.5 rounded-lg hover:from-blue-600 hover:to-blue-700">
                            {assinatura.metodoPagamento ? 'Atualizar Cartão' : 'Adicionar Cartão'}
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl card-shadow mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Opções de Acesso</h2>
                    <div className="flex items-center gap-3 p-1 bg-slate-100 rounded-lg">
                        <button onClick={() => setSelectedType('assinatura')} className={`px-4 py-1.5 rounded-md font-semibold ${selectedType === 'assinatura' ? 'bg-primary-blue text-white shadow' : 'text-slate-500'}`}>Assinatura</button>
                        <button onClick={() => setSelectedType('pacote')} className={`px-4 py-1.5 rounded-md font-semibold ${selectedType === 'pacote' ? 'bg-primary-blue text-white shadow' : 'text-slate-500'}`}>Pacotes</button>
                    </div>
                </div>
                
                {selectedType === 'assinatura' && (
                    <div className="flex justify-center items-center gap-3 mb-6">
                        <span className={selectedCycle === 'mensal' ? 'font-semibold text-primary-blue' : ''}>Mensal</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={selectedCycle === 'anual'} onChange={() => setSelectedCycle(p => p === 'mensal' ? 'anual' : 'mensal')} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-blue-500"><span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-full"></span></div>
                        </label>
                        <span className={selectedCycle === 'anual' ? 'font-semibold text-primary-blue' : ''}>Anual <span className="text-xs text-green-600">(Economize 20%)</span></span>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{renderPlanos()}</div>
            </div>

            <div id="card-faturas" className="bg-white p-6 rounded-xl card-shadow">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Histórico de Cobranças</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-sm font-semibold text-slate-600">Data</th>
                                <th className="px-4 py-3 text-sm font-semibold text-slate-600">Status</th>
                                <th className="px-4 py-3 text-sm font-semibold text-slate-600">Valor</th>
                                <th className="px-4 py-3 text-sm font-semibold text-slate-600">Descrição</th>
                                <th className="px-4 py-3 text-sm font-semibold text-slate-600">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {assinatura.faturas.length > 0 ? (
                                assinatura.faturas.map(fatura => (
                                    <tr key={fatura.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-700">{new Date(fatura.createdAt + 'T03:00:00Z').toLocaleDateString('pt-BR')}</td>
                                        <td className={`px-4 py-3 font-semibold ${getStatusBadgeClass(fatura.status)}`}>{fatura.status}</td>
                                        <td className="px-4 py-3 text-slate-800 font-medium">{fatura.valor}</td>
                                        <td className="px-4 py-3 text-slate-500 text-sm">{fatura.descricao}</td>
                                        <td className="px-4 py-3 text-center">
                                            {fatura.linkBoleto ? (
                                                <a href={fatura.linkBoleto} target="_blank" rel="noopener noreferrer" className="text-primary-blue hover:underline" title="Baixar Fatura">
                                                    <i className="fas fa-download"></i>
                                                </a>
                                            ) : (
                                                <span className="text-slate-400" title="Link indisponível">
                                                    <i className="fas fa-download"></i>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-4 py-4 text-center text-slate-500">Nenhuma cobrança encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BillingPage;
