import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/Button';
import { fetchClienteDetails } from '../api/clientesApi';
import { Skeleton } from '../components/ui/Skeleton';
import { AlertCircle } from 'lucide-react';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');

const StatusBadge = ({ status, type }) => {
    const baseClasses = "font-medium text-xs px-2 py-1 rounded-full";
    const statusClasses = {
        pedido: { "Em Andamento": "bg-blue-100 text-blue-800", "Finalizado": "bg-gray-100 text-gray-800", default: "bg-gray-100 text-gray-800" },
        pagamento: { "Pendente": "bg-yellow-100 text-yellow-800", "Pago": "bg-green-100 text-green-800", default: "bg-gray-100 text-gray-800" },
    };
    const statusClass = statusClasses[type]?.[status] || statusClasses[type]?.default;
    return <span className={`${baseClasses} ${statusClass}`}>{status}</span>;
};

const ClienteDetalhePage = () => {
    const { id } = useParams();
    
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['clienteDetails', id],
        queryFn: () => fetchClienteDetails(id),
        enabled: !!id, // Only run query if id is available
    });

    if (isLoading) {
        return (
            <div className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-8">
                <header className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-5 w-64" />
                    </div>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => <Card key={i} className="p-5"><Skeleton className="h-5 w-2/3 mb-2" /><Skeleton className="h-7 w-1/3" /></Card>)}
                </div>
                <Card>
                    <div className="p-6 border-b"><Skeleton className="h-7 w-40" /></div>
                    <div className="p-6"><Skeleton className="h-40 w-full" /></div>
                </Card>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex-1 p-6 lg:p-8 text-center text-red-500">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                <h2 className="text-xl font-bold">Erro ao carregar detalhes do cliente.</h2>
                <p>{error.message}</p>
            </div>
        );
    }

    const { cliente, pedidos, saldoDevedor } = data || {};

    if (!cliente) {
        return <div className="flex-1 p-6 lg:p-8 text-center">Cliente não encontrado.</div>;
    }

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                        {cliente.nome.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{cliente.nome}</h1>
                        <p className="text-gray-500 mt-1">{cliente.telefone} | {cliente.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">Enviar Mensagem</Button>
                    <Button className="bg-[#2F5DE4] hover:bg-[#254AC7] text-white font-semibold">Criar Novo Pedido</Button>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <Card className="p-5">
                    <p className="text-sm text-gray-500">Valor Total Gasto</p>
                    <p className="text-2xl font-bold">{formatCurrency(cliente.valorTotalGasto)}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-gray-500">Pedidos Totais</p>
                    <p className="text-2xl font-bold">{cliente.totalPedidos}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-gray-500">Saldo Devedor</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(saldoDevedor)}</p>
                </Card>
            </div>

            {/* Tabela de Histórico de Pedidos */}
            <Card className="overflow-x-auto">
                <div className="p-6 border-b">
                    <h3 className="text-xl font-bold">Histórico de Pedidos</h3>
                </div>
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th className="px-6 py-3">ID Pedido</th>
                            <th className="px-6 py-3">Descrição do Serviço</th>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Valor</th>
                            <th className="px-6 py-3">Status do Pedido</th>
                            <th className="px-6 py-3">Status do Pagamento</th>
                            <th className="px-6 py-3"><span className="sr-only">Ações</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {pedidos && pedidos.length > 0 ? (
                            pedidos.map((pedido) => (
                                <tr key={pedido._id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-[#2F5DE4] hover:underline cursor-pointer">#{pedido.shortId}</td>
                                    <td className="px-6 py-4">{pedido.descricao}</td>
                                    <td className="px-6 py-4">{formatDate(pedido.data)}</td>
                                    <td className="px-6 py-4 font-semibold">{formatCurrency(pedido.valorProposto)}</td>
                                    <td className="px-6 py-4"><StatusBadge status={pedido.status} type="pedido" /></td>
                                    <td className="px-6 py-4"><StatusBadge status={pedido.statusPagamento} type="pagamento" /></td>
                                    <td className="px-6 py-4 text-right"><Button variant="ghost" size="icon">...</Button></td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="text-center py-10 text-gray-500">Nenhum pedido encontrado para este cliente.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default ClienteDetalhePage;
