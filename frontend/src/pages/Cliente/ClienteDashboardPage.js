// src/pages/Cliente/ClienteDashboardPage.js

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { formatCurrency } from '../../lib/utils'; // Assumindo que a função está em lib/utils.js
import apiClient from '../../api/apiClient';

// --- Função da API ---
const fetchClientePedidos = async () => {
    // Usa o apiClient que já tem o interceptor de autenticação
    // e o token correto ('token_fazeresolve')
    const { data } = await apiClient.get('/portal-cliente/meus-pedidos');
    return data;
};

// --- Subcomponente para o Badge de Status ---
const StatusBadge = ({ status }) => {
    const statusStyles = {
        'Pendente': 'bg-yellow-100 text-yellow-800',
        'Aceito': 'bg-blue-100 text-blue-800',
        'Agendado': 'bg-indigo-100 text-indigo-800',
        'Finalizado': 'bg-green-100 text-green-800',
        'Rejeitado': 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
};

// --- Componente Principal ---
const ClienteDashboardPage = () => {
    const { data: pedidos, isLoading, error, isSuccess } = useQuery({
        queryKey: ['clientePedidos'],
        queryFn: fetchClientePedidos,
        // Safely select the 'pedidos' array, whether the response is nested or not
        select: (data) => data.pedidos || data || [],
    });

    return (
        <div className="min-h-screen bg-secondary">
            <header className="bg-background border-b p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold text-primary">Faz & Resolve - Portal do Cliente</h1>
                    <nav>
                        <Link to="/cliente/historico" className="text-sm font-medium text-muted-foreground hover:text-primary">
                            Histórico Completo
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-6 space-y-6">
                <div className="text-center md:text-left">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Seus Pedidos</h2>
                    <p className="text-muted-foreground">Acompanhe o estado de todos os seus serviços solicitados.</p>
                </div>

                {isLoading && <p className="text-center text-muted-foreground">A carregar os seus pedidos...</p>}
                {error && <p className="text-center text-destructive">{error.message}</p>}

                {isSuccess && pedidos.length > 0 && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {pedidos.map((pedido) => (
                            <Link to={`/cliente/pedidos/${pedido._id}`} key={pedido._id} className="block hover:-translate-y-1 transition-transform duration-200">
                                <Card className="h-full flex flex-col">
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-lg">Pedido #{pedido.shortId}</CardTitle>
                                            <StatusBadge status={pedido.status} />
                                        </div>
                                        <CardDescription>
                                            Solicitado em: {new Date(pedido.data).toLocaleDateString('pt-BR')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-muted-foreground line-clamp-3">
                                            {pedido.descricao}
                                        </p>
                                    </CardContent>
                                    {pedido.valorProposto > 0 && (
                                        <div className="p-6 pt-0 font-semibold text-right text-primary">
                                            Valor: {formatCurrency(pedido.valorProposto)}
                                        </div>
                                    )}
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                {isSuccess && pedidos.length === 0 && (
                    <div className="text-center text-muted-foreground py-16">
                        <p className="text-lg">Você ainda não tem nenhum pedido registado.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ClienteDashboardPage;
