// src/pages/PedidosPage.js

import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast'; // <-- ADICIONADO
import KanbanSkeleton from '../components/skeletons/KanbanSkeleton.js';
import { motion } from 'framer-motion';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Package, CircleDollarSign, CheckCircle, AlertTriangle, User, Search, Plus, MoreVertical } from 'lucide-react';


// --- Funções Auxiliares e Ícones ---
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};
const statusOrdem = ['Pendente', 'Aceito', 'Agendado', 'Finalizado', 'Rejeitado'];


// --- Funções de API ---
const fetchAllPedidos = async ({ queryKey }) => {
    const [, { searchTerm, filtroStatusPagamento, dataInicio, dataFim }] = queryKey;
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (filtroStatusPagamento && filtroStatusPagamento !== 'todos') params.append('statusPagamento', filtroStatusPagamento);
    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);

    const { data } = await apiClient.get('/orcamentos', { 
        params,
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
        }
    });
    return data;
};

const updatePedidoStatus = async ({ pedidoId, newStatus }) => {
    const { data } = await apiClient.patch(`/orcamentos/${pedidoId}/status`, { status: newStatus });
    return data;
};

const StatusBadge = ({ status, type = 'pagamento' }) => {
    const pagamentoStatusInfo = {
        'Pendente': 'bg-red-100 text-red-800',
        'Pago Parcial': 'bg-yellow-100 text-yellow-800',
        'Pago': 'bg-green-100 text-green-800',
    };

    const pedidoStatusInfo = {
        'Pendente': 'bg-gray-200 text-gray-800',
        'Aceito': 'bg-blue-100 text-blue-800',
        'Agendado': 'bg-cyan-100 text-cyan-800',
        'Finalizado': 'bg-green-200 text-green-800',
        'Rejeitado': 'bg-red-200 text-red-800',
    };
    
    const statusInfo = type === 'pagamento' ? pagamentoStatusInfo : pedidoStatusInfo;
    const className = statusInfo[status] || 'bg-gray-100 text-gray-800';
    
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${className}`}>{status}</span>;
};


// --- Componente Principal ---
const columnStyles = {
    'Pendente': { borderColor: 'border-gray-400', textColor: 'text-gray-700', valueColor: 'text-gray-600' },
    'Aceito': { borderColor: 'border-blue-500', textColor: 'text-blue-700', valueColor: 'text-blue-600' },
    'Agendado': { borderColor: 'border-cyan-500', textColor: 'text-cyan-700', valueColor: 'text-cyan-600' },
    'Finalizado': { borderColor: 'border-green-500', textColor: 'text-green-700', valueColor: 'text-green-600' },
    'Rejeitado': { borderColor: 'border-red-500', textColor: 'text-red-700', valueColor: 'text-red-600' },
};

function PedidosPage() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroStatusPagamento, setFiltroStatusPagamento] = useState('todos');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');

    const queryClient = useQueryClient();

    const { data: pedidos, isLoading, error } = useQuery({
        queryKey: ['pedidos', { searchTerm, filtroStatusPagamento, dataInicio, dataFim }],
        queryFn: fetchAllPedidos,
    });

    const updateStatusMutation = useMutation({
        mutationFn: updatePedidoStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            toast.success("Pedido atualizado!");
        },
        onError: (err) => {
            toast.error(`Erro ao atualizar: ${err.message}`);
        }
    });

    const colunas = useMemo(() => {
        const pedidosPorStatus = statusOrdem.reduce((acc, status) => {
            acc[status] = { pedidos: [], valorTotal: 0 };
            return acc;
        }, {});

        if (pedidos) {
            pedidos.forEach(pedido => {
                if (pedidosPorStatus[pedido.status]) {
                    pedidosPorStatus[pedido.status].pedidos.push(pedido);
                    pedidosPorStatus[pedido.status].valorTotal += pedido.valorProposto || 0;
                }
            });
        }
        return pedidosPorStatus;
    }, [pedidos]);

    const summaryStats = useMemo(() => {
        if (!pedidos) {
            return { totalPedidos: 0, valorEmAberto: 0, pedidosConcluidos: 0, pedidosAtrasados: 0 };
        }
        return pedidos.reduce((acc, pedido) => {
            acc.totalPedidos += 1;
            if (pedido.status !== 'Finalizado' && pedido.status !== 'Rejeitado') {
                acc.valorEmAberto += pedido.valorProposto || 0;
            }
            if (pedido.status === 'Finalizado') {
                acc.pedidosConcluidos += 1;
            }
            const diasPendente = (new Date() - new Date(pedido.data)) / (1000 * 60 * 60 * 24);
            if (pedido.status === 'Pendente' && diasPendente > 3) {
                acc.pedidosAtrasados += 1;
            }
            return acc;
        }, { totalPedidos: 0, valorEmAberto: 0, pedidosConcluidos: 0, pedidosAtrasados: 0 });
    }, [pedidos]);

    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
            return;
        }
        updateStatusMutation.mutate({ pedidoId: draggableId, newStatus: destination.droppableId });
    };

    if (error) return <div className="p-4"><p className="text-center text-red-500">Erro: {error.message}</p></div>;

    return (
        <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
            {/* Cabeçalho e Ações */}
            <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Gestão de Pedidos</h1>
                    <p className="text-gray-500 mt-1">Arraste os cards para alterar o status dos pedidos.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input type="text" placeholder="Buscar por cliente, telefone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
                    </div>
                    <Link to="/pedidos/novo">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> Novo Pedido
                        </Button>
                    </Link>
                </div>
            </header>

            {/* KPIs / Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? '...' : summaryStats.totalPedidos}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor em Aberto</CardTitle>
                        <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? '...' : formatCurrency(summaryStats.valorEmAberto)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{isLoading ? '...' : summaryStats.pedidosConcluidos}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{isLoading ? '...' : summaryStats.pedidosAtrasados}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Status Pgto:</label>
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        {['todos', 'Pendente', 'Pago Parcial', 'Pago'].map(status => (
                            <button key={status} onClick={() => setFiltroStatusPagamento(status.toLowerCase())} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${filtroStatusPagamento === status.toLowerCase() ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="dataInicio" className="text-sm font-medium text-gray-600">De:</label>
                    <input id="dataInicio" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="p-2 border rounded-lg bg-white" />
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="dataFim" className="text-sm font-medium text-gray-600">Até:</label>
                    <input id="dataFim" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="p-2 border rounded-lg bg-white" />
                </div>
                <button onClick={() => { setDataInicio(''); setDataFim(''); setFiltroStatusPagamento('todos'); }} className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Limpar Filtros</button>
            </div>


            {isLoading ? (
                <KanbanSkeleton />
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 pb-4">
                        {statusOrdem.map((colunaId) => {
                            const column = colunas[colunaId];
                            const { borderColor, textColor, valueColor } = columnStyles[colunaId] || columnStyles['Pendente'];
                            return (
                                <Droppable key={colunaId} droppableId={colunaId}>
                                    {(provided, snapshot) => (
                                        <div 
                                            ref={provided.innerRef} 
                                            {...provided.droppableProps} 
                                            className={`bg-slate-100 rounded-xl flex flex-col shadow-sm ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                                        >
                                            <div className={`p-4 border-t-4 rounded-t-xl ${borderColor}`}>
                                                <h2 className={`font-bold ${textColor} flex justify-between items-center`}>
                                                    <span>{colunaId}</span>
                                                    <span className="text-sm bg-slate-200 text-slate-600 font-medium px-2 py-0.5 rounded-full">
                                                        {column?.pedidos.length || 0}
                                                    </span>
                                                </h2>
                                                <p className={`text-sm font-semibold ${valueColor} mt-1`}>
                                                    {formatCurrency(column?.valorTotal || 0)}
                                                </p>
                                            </div>
                                            <div className="p-2 space-y-3 h-full overflow-y-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}>
                                                {(column?.pedidos || []).map((pedido, index) => {
                                                    const diasPendente = (new Date() - new Date(pedido.data)) / (1000 * 60 * 60 * 24);
                                                    const precisaAtencao = pedido.status === 'Pendente' && diasPendente > 3;
                                                    return (
                                                        <Draggable key={pedido._id} draggableId={pedido._id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <motion.div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    onClick={() => navigate(`/pedidos/${pedido._id}`)}
                                                                    className={`bg-white rounded-lg shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 
                                                                        ${snapshot.isDragging ? 'shadow-2xl rotate-3 scale-105' : ''}
                                                                        ${precisaAtencao ? 'border-2 border-red-500' : ''}
                                                                    `}
                                                                    initial={{ opacity: 0, y: 10 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    transition={{ delay: index * 0.05 }}
                                                                >
                                                                    <div className="p-3 flex flex-col h-full">
                                                                        <div className="flex justify-between items-start">
                                                                            <StatusBadge status={pedido.status} type="pedido" />
                                                                            <button className="text-gray-400 hover:text-gray-600 -mr-1 -mt-1" onClick={(e) => {e.stopPropagation(); alert('Menu do pedido ' + pedido.shortId)}}>
                                                                                <MoreVertical size={18} />
                                                                            </button>
                                                                        </div>
                                                                        
                                                                        <p className="font-bold text-gray-800 my-2">Pedido #{pedido.shortId}</p>
                                                                        
                                                                        <div className="flex items-center text-sm text-gray-600 mb-3">
                                                                            <User size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                                                                            <span className="truncate">{pedido.cliente?.nome || 'Cliente não identificado'}</span>
                                                                        </div>
                                                                        
                                                                        <div className="flex-grow"></div>
                                                                    
                                                                        <div className="mt-auto pt-2 border-t flex justify-between items-center">
                                                                            <span className="text-lg font-bold text-gray-800">{formatCurrency(pedido.valorProposto)}</span>
                                                                            <StatusBadge status={pedido.statusPagamento || 'Pendente'} type="pagamento" />
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </Draggable>
                                                    )
                                                })}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            )
                        })}
                    </div>
                </DragDropContext>
            )}
        </div>
    );
}
export default PedidosPage;
