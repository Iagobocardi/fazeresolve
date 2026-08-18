import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';
import TransacaoFormModal from '../components/TransacaoFormModal';

const FinanceiroPage = () => {
    const [activeTab, setActiveTab] = useState('historico');
    const [overviewData, setOverviewData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [period, setPeriod] = useState('30d');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data } = await apiClient.get(`/financeiro/overview?period=${period}&_=${new Date().getTime()}`);
            setOverviewData(data);
        } catch (error) {
            toast.error('Falha ao carregar os dados financeiros.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (type) => {
        setModalType(type);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSaveAndRefresh = () => {
        fetchData();
    };

    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Gestão Financeira</h1>
                    <p className="text-slate-500 mt-1">Acompanhe suas receitas, despesas e a saúde do seu negócio.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => handleOpenModal('Despesa')} className="bg-white border border-slate-300 text-slate-700 font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center">
                        <i className="fas fa-minus-circle text-red-500 mr-2"></i>
                        <span>Nova Despesa</span>
                    </button>
                    <button onClick={() => handleOpenModal('Receita')} className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold px-5 py-2.5 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5">
                        <i className="fas fa-plus-circle mr-2"></i>
                        <span>Nova Receita</span>
                    </button>
                </div>
            </header>
            
            {isLoading || !overviewData ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-pulse">
                        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white p-5 rounded-xl shadow-sm h-24"></div>)}
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm mb-8 animate-pulse h-64"></div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-5 rounded-xl shadow-sm">
                            <p className="text-sm font-semibold text-slate-500">Faturamento Bruto</p>
                            <p className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(overviewData.kpis.faturamentoBruto)}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm">
                            <p className="text-sm font-semibold text-slate-500">Total de Despesas</p>
                            <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(overviewData.kpis.totalDespesas)}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm">
                            <p className="text-sm font-semibold text-slate-500">Lucro Líquido</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(overviewData.kpis.lucroLiquido)}</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm">
                            <p className="text-sm font-semibold text-slate-500">Margem de Lucro</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">{overviewData.kpis.margemDeLucro.toFixed(1)}%</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800">Balanço do Período</h2>
                            <div className="flex items-center bg-slate-100 rounded-lg p-1">
                                <button onClick={() => setPeriod('7d')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${period === '7d' ? 'text-white bg-blue-500 shadow' : 'text-slate-500'}`}>7 dias</button>
                                <button onClick={() => setPeriod('30d')} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${period === '30d' ? 'text-white bg-blue-500 shadow' : 'text-slate-500'}`}>30 dias</button>
                            </div>
                        </div>
                        <div className="w-full h-48 bg-slate-50 rounded-lg p-4 flex items-end gap-4">
                            <div className="flex-1 h-full flex flex-col justify-end items-center">
                                <div className="w-full md:w-3/4 bg-blue-500 rounded-t-md" style={{ height: `${calculateBarHeight(overviewData.kpis.faturamentoBruto, overviewData.kpis.totalDespesas, 'receita')}%` }}></div>
                                <span className="text-xs font-bold text-slate-600 mt-1">Receitas</span>
                            </div>
                            <div className="flex-1 h-full flex flex-col justify-end items-center">
                                <div className="w-full md:w-3/4 bg-red-500 rounded-t-md" style={{ height: `${calculateBarHeight(overviewData.kpis.faturamentoBruto, overviewData.kpis.totalDespesas, 'despesa')}%` }}></div>
                                <span className="text-xs font-bold text-slate-600 mt-1">Despesas</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="bg-white rounded-xl shadow-sm">
                <div className="p-4 border-b border-slate-200 flex items-center gap-2">
                    <button onClick={() => setActiveTab('historico')} className={`font-semibold px-4 py-2 rounded-lg border-2 border-transparent ${activeTab === 'historico' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'}`}>
                        <i className="fas fa-history mr-2"></i>Histórico de Transações
                    </button>
                    <button onClick={() => setActiveTab('contas')} className={`font-semibold px-4 py-2 rounded-lg border-2 border-transparent ${activeTab === 'contas' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'}`}>
                        <i className="fas fa-calendar-alt mr-2"></i>Contas a Pagar
                    </button>
                    <button onClick={() => setActiveTab('recebimentos')} className={`font-semibold px-4 py-2 rounded-lg border-2 border-transparent ${activeTab === 'recebimentos' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'}`}>
                        <i className="fas fa-hand-holding-usd mr-2"></i>Recebimentos Pendentes
                    </button>
                </div>

                <div className="p-4">
                    {isLoading ? (
                        <div className="text-center p-8">Carregando transações...</div>
                    ) : (
                        <>
                            {activeTab === 'historico' && <HistoricoTab transacoes={overviewData.transacoesAgrupadas} onTransactionDeleted={fetchData} />}
                            {activeTab === 'contas' && <ContasAPagarTab contas={overviewData.contasAPagar} />}
                            {activeTab === 'recebimentos' && <RecebimentosPendentesTab recebimentos={overviewData.recebimentosPendentes} />}
                        </>
                    )}
                </div>
            </div>

            <TransacaoFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                type={modalType}
                onSave={handleSaveAndRefresh}
            />
        </div>
    );
};

const HistoricoTab = ({ transacoes: transacoesAgrupadas, onTransactionDeleted }) => {
    const [transacoes, setTransacoes] = useState(transacoesAgrupadas);

    useEffect(() => {
        setTransacoes(transacoesAgrupadas);
    }, [transacoesAgrupadas]);

    const handleDelete = async (transacaoId) => {
        if (!window.confirm('Tem certeza de que deseja excluir esta transação? A ação não pode ser desfeita.')) {
            return;
        }

        try {
            await apiClient.delete(`/financeiro/transacao/${transacaoId}`);
            toast.success('Transação excluída com sucesso!');
            onTransactionDeleted(); // Atualiza a página inteira
        } catch (error) {
            console.error("Erro ao excluir transação:", error);
            toast.error('Houve um erro ao excluir a transação. Tente novamente.');
        }
    };

    return (
        <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-4">Veja o lucro de cada serviço agrupando as receitas e despesas vinculadas.</p>
            {transacoes.map(transacao => (
                <details key={transacao._id} className="bg-slate-50 rounded-lg transition-all duration-300">
                    <summary className="p-4 flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-4">
                            <i className="fas fa-chevron-right text-slate-400 transition-transform arrow-icon"></i>
                            <div>
                                <p className="font-bold text-slate-800">{transacao.descricao} - {transacao.clienteNome} <span className="text-sm font-normal text-slate-500">({transacao.shortId})</span></p>
                                <p className="text-sm text-slate-500">{formatDate(transacao.data)}</p>
                            </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                            <div>
                                <p className={`font-bold text-lg ${transacao.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>{transacao.lucro >= 0 ? 'Lucro' : 'Prejuízo'}: {formatCurrency(transacao.lucro)}</p>
                                <p className="text-xs text-slate-500">Receita: {formatCurrency(transacao.totalReceitas)} / Despesas: {formatCurrency(transacao.totalDespesas)}</p>
                            </div>
                            {transacao.shortId === 'MANUAL' && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDelete(transacao._id);
                                    }}
                                    title="Excluir transação"
                                    className="bg-transparent border-none cursor-pointer text-red-500 hover:text-red-700 p-2"
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            )}
                        </div>
                    </summary>
                    <div className="px-4 pb-4 ml-8 border-l-2 border-slate-200">
                        <div className="pl-6 space-y-2 text-sm">
                            {transacao.receitas.map((r, i) => (
                                <div key={`r-${i}`} className="flex items-center justify-between p-2 rounded-md bg-green-50 text-green-700">
                                    <div className="flex items-center gap-2"><i className="fas fa-arrow-up"></i><span>Recebimento do serviço</span></div>
                                    <span className="font-bold">+ {formatCurrency(r.valor)}</span>
                                </div>
                            ))}
                            {transacao.despesas.map((d, i) => (
                                 <div key={`d-${i}`} className="flex items-center justify-between p-2 rounded-md bg-red-50 text-red-700">
                                    <div className="flex items-center gap-2"><i className="fas fa-arrow-down"></i><span>{d.descricao || 'Despesa'}</span></div>
                                    <span className="font-bold">- {formatCurrency(d.valor)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </details>
            ))}
        </div>
    );
};

const ContasAPagarTab = ({ contas }) => (
    <div>
        <p className="text-sm text-slate-500 mb-4">Contas e despesas com vencimento nos próximos 30 dias.</p>
        <div className="divide-y divide-slate-100">
            {contas.map(conta => (
                <div key={conta._id} className="py-3 flex justify-between items-center">
                    <div>
                        <p className="font-bold text-slate-700">{conta.descricao}</p>
                        <p className="text-sm text-slate-500">Vence em {formatDate(conta.dataVencimento)}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-red-600">{formatCurrency(conta.valor)}</p>
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">PENDENTE</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const RecebimentosPendentesTab = ({ recebimentos }) => (
     <div>
        <p className="text-sm text-slate-500 mb-4">Faturas de clientes que ainda não foram pagas.</p>
        <div className="divide-y divide-slate-100">
            {recebimentos.map(recebimento => (
                 <div key={recebimento._id} className="py-3 flex justify-between items-center">
                    <div>
                        <p className="font-bold text-slate-700">{recebimento.cliente.nome}</p>
                        <p className="text-sm text-slate-500">Vence em {formatDate(recebimento.dataVencimento)}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(recebimento.valorProposto)}</p>
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">PENDENTE</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
};

const calculateBarHeight = (receitas, despesas, type) => {
    const total = receitas + despesas;
    if (total === 0) return 5;
    if (type === 'receita') {
        const height = (receitas / total) * 100;
        return Math.max(height, 5);
    }
    const height = (despesas / total) * 100;
    return Math.max(height, 5);
};

export default FinanceiroPage;