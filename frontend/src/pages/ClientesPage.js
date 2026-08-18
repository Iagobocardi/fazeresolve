import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientes } from '../api/clientesApi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const ClientesPage = () => {
    const { accountStatus } = useAuth();
    const isLocked = accountStatus === 'LOCKED';
    const [viewMode, setViewMode] = useState('grid');
    const [kpis, setKpis] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const fetchData = useCallback(async (search = '') => {
        setIsLoading(true);
        try {
            const data = await getClientes(search);
            setKpis(data.kpis);
            setClientes(data.clientes);
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Falha ao carregar os dados dos clientes.';
            toast.error(errorMessage);
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            fetchData(searchTerm);
        }, 500);

        return () => clearTimeout(handler);
    }, [searchTerm, fetchData]);

    useEffect(() => {
        fetchData(); // Initial fetch
    }, [fetchData]);


    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Gestão de Clientes (CRM)</h1>
                    <p className="text-slate-500 mt-1">Visualize, gerencie e fortaleça o relacionamento com seus clientes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => !isLocked && navigate('/clientes/novo')}
                        disabled={isLocked}
                        title={isLocked ? "A sua conta está suspensa. Regularize o pagamento." : "Adicionar um novo cliente"}
                        className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                        <i className="fas fa-plus mr-2"></i>
                        <span>Novo Cliente</span>
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {isLoading || !kpis ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white p-5 rounded-xl shadow-sm animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                        </div>
                    ))
                ) : (
                    <>
                        <div className="bg-white p-5 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                             <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Clientes Ativos</p>
                                    <p className="text-3xl font-bold text-slate-800 mt-1">{kpis.clientesAtivos}</p>
                                </div>
                                <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 text-blue-500 rounded-full text-xl"><i className="fas fa-users"></i></div>
                            </div>
                            <p className="text-xs text-green-600 mt-2 flex items-center"><i className="fas fa-arrow-up mr-1"></i> {kpis.novosClientesEsteMes} novos este mês</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Saldo Devedor</p>
                                    <p className="text-3xl font-bold text-red-600 mt-1">{formatCurrency(kpis.saldoDevedorTotal)}</p>
                                </div>
                                <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-red-100 to-red-200 text-red-500 rounded-full text-xl"><i className="fas fa-file-invoice-dollar"></i></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">em {kpis.faturasAtrasadasCount} faturas atrasadas</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                             <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Valor Médio / Serviço</p>
                                    <p className="text-3xl font-bold text-slate-800 mt-1">{formatCurrency(kpis.valorMedioPorServico)}</p>
                                </div>
                                <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 text-green-500 rounded-full text-xl"><i className="fas fa-chart-line"></i></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Média dos últimos 30 dias</p>
                        </div>
                        <div className="bg-white p-5 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Próximos Agendamentos</p>
                                    <p className="text-3xl font-bold text-slate-800 mt-1">{kpis.proximosAgendamentos}</p>
                                </div>
                                <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-500 rounded-full text-xl"><i className="fas fa-calendar-check"></i></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">para esta semana</p>
                        </div>
                    </>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row items-center gap-4">
                <div className="relative w-full md:flex-1">
                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                        type="text" 
                        placeholder="Buscar por cliente, telefone, endereço ou serviço..." 
                        className="w-full bg-slate-100 border-2 border-transparent rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="w-full md:w-auto bg-white border border-slate-300 text-slate-700 font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center justify-center">
                        <i className="fas fa-filter mr-2 text-slate-400"></i>
                        <span>Filtros</span>
                    </button>
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'list' ? 'text-white bg-blue-500 shadow' : 'text-slate-500 hover:bg-white hover:text-blue-500'}`}>
                            <i className="fas fa-list"></i>
                        </button>
                        <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'text-white bg-blue-500 shadow' : 'text-slate-500 hover:bg-white hover:text-blue-500'}`}>
                            <i className="fas fa-th-large"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div>
                {isLoading && clientes.length === 0 ? (
                    <div className="text-center p-8"><p>Carregando clientes...</p></div>
                ) : !isLoading && clientes.length === 0 ? (
                    <div className="text-center p-8 bg-white rounded-xl shadow-sm">
                        <h3 className="text-xl font-semibold text-slate-700">Nenhum cliente encontrado</h3>
                        <p className="text-slate-500 mt-2">Tente ajustar sua busca ou adicione um novo cliente.</p>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div id="grid-view" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {clientes.map(client => <ClientCard key={client._id} client={client} navigate={navigate} />)}
                    </div>
                ) : (
                    <div id="list-view" className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-100">
                             <div className="bg-slate-50/70 px-5 py-3 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <div className="col-span-4">Cliente</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2">Próx. Agend.</div>
                                <div className="col-span-2 text-right">Total Gasto</div>
                                <div className="col-span-2 text-center">Ações</div>
                            </div>
                            {clientes.map(client => <ClientRow key={client._id} client={client} navigate={navigate} />)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ClientCard = ({ client, navigate }) => (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col border-2 border-transparent hover:border-blue-500">
        <div className="p-5 flex-grow">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0">{getInitials(client.nome)}</div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">{client.nome}</h3>
                        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                            <i className="fas fa-map-marker-alt text-slate-400"></i> {client.endereco.cidade}, {client.endereco.estado}
                        </p>
                    </div>
                </div>
                <StatusBadge status={client.statusFinanceiro} />
            </div>
            <div className="mt-4 flex items-center gap-2">
                <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">{client.clientTag}</span>
            </div>
            <div className="border-t border-slate-100 my-4"></div>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                    <span className="font-medium text-slate-500">Último Serviço:</span>
                    <span className="font-semibold text-slate-700">{formatDate(client.ultimoServico)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-slate-500">Próximo Agend.:</span>
                    <span className="font-semibold text-slate-700">{formatDate(client.proximoAgendamento)} {client.proximoAgendamentoDesc ? `(${client.proximoAgendamentoDesc})` : ''}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-medium text-slate-500">Total Gasto:</span>
                    <span className="font-bold text-green-600">{formatCurrency(client.valorTotalGasto)}</span>
                </div>
                {client.faturaAtrasadaValor && (
                     <div className="flex justify-between">
                        <span className="font-medium text-slate-500">Fatura Atrasada:</span>
                        <span className="font-semibold text-red-600">{client.faturaAtrasadaId} ({formatCurrency(client.faturaAtrasadaValor)})</span>
                    </div>
                )}
                 {client.faturaAbertaValor && (
                     <div className="flex justify-between">
                        <span className="font-medium text-slate-500">Fatura Aberta:</span>
                        <span className="font-semibold text-amber-600">{client.faturaAbertaId} ({formatCurrency(client.faturaAbertaValor)})</span>
                    </div>
                )}
            </div>
        </div>
        <div className="bg-slate-50 p-3 border-t border-slate-200/60 flex justify-between items-center">
            <div className="text-slate-500 flex gap-1">
                <button onClick={() => window.location.href = `tel:${client.telefone}`} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-blue-100 hover:text-blue-500 transition-colors" title="Ligar"><i className="fas fa-phone-alt"></i></button>
                <button onClick={() => navigate(`/novo-orcamento?clienteId=${client._id}`)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-blue-100 hover:text-blue-500 transition-colors" title="Novo Orçamento"><i className="fas fa-file-invoice"></i></button>
                <button onClick={() => navigate(`/novo-agendamento?clienteId=${client._id}`)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-blue-100 hover:text-blue-500 transition-colors" title="Novo Agendamento"><i className="fas fa-calendar-plus"></i></button>
            </div>
            <button onClick={() => navigate(`/clientes/${client._id}`)} className="font-bold text-sm text-blue-500 hover:underline">Ver Perfil <i className="fas fa-arrow-right ml-1"></i></button>
        </div>
    </div>
);

const ClientRow = ({ client, navigate }) => (
    <div className="px-5 py-4 grid grid-cols-12 gap-4 items-center hover:bg-slate-50 transition-colors">
        <div className="col-span-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-md flex-shrink-0">{getInitials(client.nome)}</div>
            <div>
                <p className="font-bold text-slate-800">{client.nome}</p>
                <p className="text-sm text-slate-500">{client.endereco.cidade}, {client.endereco.estado}</p>
            </div>
        </div>
        <div className="col-span-2"><StatusBadge status={client.statusFinanceiro} /></div>
        <div className="col-span-2 font-semibold text-slate-700 text-sm">{formatDate(client.proximoAgendamento)}</div>
        <div className="col-span-2 font-bold text-green-600 text-right">{formatCurrency(client.valorTotalGasto)}</div>
        <div className="col-span-2 text-slate-500 flex gap-2 justify-center">
             <button onClick={() => window.location.href = `tel:${client.telefone}`} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-blue-100 hover:text-blue-500 transition-colors" title="Ligar"><i className="fas fa-phone-alt"></i></button>
            <button onClick={() => navigate(`/novo-orcamento?clienteId=${client._id}`)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-blue-100 hover:text-blue-500 transition-colors" title="Novo Orçamento"><i className="fas fa-file-invoice"></i></button>
            <button onClick={() => navigate(`/novo-agendamento?clienteId=${client._id}`)} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-blue-100 hover:text-blue-500 transition-colors" title="Novo Agendamento"><i className="fas fa-calendar-plus"></i></button>
        </div>
    </div>
);


// Helper functions and sub-components can be defined here if they are only used in this file.

const getInitials = (name) => {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
};

const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const StatusBadge = ({ status }) => {
    const statusMap = {
        EM_DIA: { text: 'EM DIA', classes: 'bg-green-100 text-green-700' },
        AG_PGTO: { text: 'AG. PGTO', classes: 'bg-amber-100 text-amber-700' },
        INADIMPLENTE: { text: 'INADIMPLENTE', classes: 'bg-red-100 text-red-700' },
    };
    const { text, classes } = statusMap[status] || { text: 'DESCONHECIDO', classes: 'bg-gray-100 text-gray-700' };
    return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${classes}`}>{text}</span>;
};


export default ClientesPage;
