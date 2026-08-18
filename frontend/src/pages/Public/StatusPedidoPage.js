// src/pages/Public/StatusPedidoPage.js

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from '../../api/apiClient';

// Função para buscar os detalhes públicos do pedido
const fetchPedidoPublico = async (publicId) => {
    try {
        const { data } = await apiClient.get(`/public/pedidos/${publicId}`);
        return data;
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Pedido não encontrado ou link inválido.');
    }
};

// Função genérica para realizar uma ação (aprovar/rejeitar)
const realizarAcaoPedido = async ({ publicId, action }) => {
    const { data } = await apiClient.post(`/public/pedidos/${publicId}/${action}`);
    return data;
};

// Função para sugerir agendamento
const sugerirAgendamento = async ({ publicId, dataSugerida }) => {
    const { data } = await apiClient.patch(`/public/pedidos/${publicId}/sugerir-agendamento`, { dataSugerida });
    return data;
};

const StatusPedidoPage = () => {
    const { publicId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [novaDataSugerida, setNovaDataSugerida] = useState('');

    const { data: pedido, isLoading, error } = useQuery({
        queryKey: ['pedidoPublico', publicId],
        queryFn: () => fetchPedidoPublico(publicId),
    });

    const acaoMutation = useMutation({
        mutationFn: realizarAcaoPedido,
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.setQueryData(['pedidoPublico', publicId], data.orcamento); // Atualiza os dados na tela
        },
        onError: (err) => toast.error(err.message)
    });

    const agendamentoMutation = useMutation({
        mutationFn: sugerirAgendamento,
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.setQueryData(['pedidoPublico', publicId], data.orcamento);
        },
        onError: (err) => toast.error(err.message)
    });
    
    const handleSugerirSubmit = (e) => {
        e.preventDefault();
        agendamentoMutation.mutate({ publicId, dataSugerida: novaDataSugerida });
    };

    const handlePayment = () => {
        navigate(`/pay/${publicId}`);
    };

    if (isLoading) return <div className="p-8 text-center">A carregar status do pedido...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error.message}</div>;

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-gray-800">Status do Pedido #{pedido.shortId}</h1>
                <p className="text-lg mt-2">Olá, <span className="font-semibold">{pedido.cliente.nome}</span>!</p>
                
                <div className="mt-6">
                    <p>Status Atual: <span className="font-bold text-blue-600">{pedido.status}</span></p>
                </div>

                {/* Ações para o cliente */}
                <div className="mt-6 border-t pt-6 space-y-4">
                    {/* Aprovar/Rejeitar Orçamento */}
                    {pedido.status === 'Pendente' && pedido.valorProposto > 0 && (
                        <div>
                            <h3 className="font-semibold mb-2">Seu orçamento está pronto!</h3>
                            <p className="text-2xl font-bold text-green-600 mb-4">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valorProposto)}</p>
                            <div className="flex space-x-4">
                                <button onClick={() => acaoMutation.mutate({ publicId, action: 'aprovar' })} disabled={acaoMutation.isPending} className="flex-1 px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600">Aprovar Orçamento</button>
                                <button onClick={() => acaoMutation.mutate({ publicId, action: 'rejeitar' })} disabled={acaoMutation.isPending} className="flex-1 px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600">Rejeitar</button>
                            </div>
                        </div>
                    )}

                    {/* Sugerir Agendamento */}
                    {['Aceito', 'Agendado'].includes(pedido.status) && pedido.statusPagamento !== 'Pago' && (
                         <div>
                            <h3 className="font-semibold mb-2">{pedido.status === 'Agendado' ? 'Solicitar Reagendamento' : 'Sugerir Data para o Serviço'}</h3>
                            <form onSubmit={handleSugerirSubmit} className="flex items-center space-x-2">
                                <input type="text" value={novaDataSugerida} onChange={(e) => setNovaDataSugerida(e.target.value)} placeholder="Ex: Amanhã à tarde" className="flex-grow p-2 border rounded-md" required />
                                <button type="submit" disabled={agendamentoMutation.isPending} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Enviar Sugestão</button>
                            </form>
                         </div>
                    )}

                    {/* Botão de Pagamento */}
                    {pedido.status === 'Aceito' && pedido.statusPagamento === 'Pendente' && (
                        <div>
                            <h3 className="font-semibold mb-2">Pagamento Pendente</h3>
                            <p className="mb-4">O seu orçamento foi aceite. Efetue o pagamento para agendar o serviço.</p>
                            <button onClick={handlePayment} className="w-full px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600">
                                Pagar Agora
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatusPedidoPage;
