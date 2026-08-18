import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHistoricoServicos } from '../../api/clientesApi';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.jsx";

const HistoricoPage = () => {
    const { data: historico, isLoading, error } = useQuery({
        queryKey: ['historicoServicos'],
        queryFn: getHistoricoServicos
    });

    if (isLoading) return <p className="p-6 text-muted-foreground">A carregar histórico...</p>;
    if (error) return <p className="p-6 text-destructive">Erro ao carregar histórico: {error.message}</p>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Histórico de Serviços</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Seus Serviços e Orçamentos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Data</th>
                                    <th className="px-4 py-2 text-left font-semibold">Descrição</th>
                                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                                    <th className="px-4 py-2 text-left font-semibold">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historico && historico.length > 0 ? (
                                    historico.map(item => (
                                        <tr key={item._id} className="border-t">
                                            <td className="px-4 py-2">{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                                            <td className="px-4 py-2">{item.descricao}</td>
                                            <td className="px-4 py-2">{item.status}</td>
                                            <td className="px-4 py-2">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorProposto || 0)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-muted-foreground">
                                            Nenhum serviço encontrado no seu histórico.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default HistoricoPage;
