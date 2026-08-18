// src/pages/Cliente/PedidoDetalheClientePage.js

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/Button.jsx';
import { X, Camera, Upload } from 'lucide-react';
import { deleteFotoPedidoCliente, uploadFotoPedidoCliente } from '../../api/pedidosApi.js';

// Função auxiliar para formatar a moeda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

// --- Funções de API (movidas para fora para uma melhor organização) ---
const fetchPedido = (id) => apiClient.get(`/orcamentos/${id}`);

const handleAction = ({ id, action }) => apiClient.post(`/portal-cliente/pedidos/${id}/${action}`);

const sugerirAgendamentoApi = ({ id, dataSugerida }) => apiClient.patch(`/portal-cliente/pedidos/${id}/sugerir-agendamento`, { dataSugerida });


const PedidoDetalheClientePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [mostrarFormReagendamento, setMostrarFormReagendamento] = useState(false);
    const [novaDataSugerida, setNovaDataSugerida] = useState('');
    const [viewingImage, setViewingImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const { data: pedido, isLoading, error } = useQuery({
        queryKey: ['pedidoCliente', id],
        queryFn: () => fetchPedido(id),
        select: (response) => response.data,
    });

    const actionMutation = useMutation({
        mutationFn: handleAction,
        onSuccess: (data, variables) => {
            toast.success(`Orçamento ${variables.action === 'aprovar' ? 'aprovado' : 'rejeitado'} com sucesso!`);
            queryClient.invalidateQueries({ queryKey: ['pedidoCliente', id] });
            if (variables.action === 'aprovar') {
                navigate('/cliente/dashboard');
            }
        },
        onError: (err) => toast.error(err.message),
    });

    const reagendamentoMutation = useMutation({
        mutationFn: sugerirAgendamentoApi,
        onSuccess: () => {
            toast.success('A sua sugestão foi enviada com sucesso!');
            setMostrarFormReagendamento(false);
            queryClient.invalidateQueries({ queryKey: ['pedidoCliente', id] });
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteFotoMutation = useMutation({
        mutationFn: deleteFotoPedidoCliente,
        onSuccess: () => {
            toast.success('Foto excluída com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['pedidoCliente', id] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Falha ao excluir a foto.');
        }
    });

    const handleDeleteFoto = (e, fotoId) => {
        e.stopPropagation();
        if (window.confirm('Tem certeza que deseja excluir esta foto?')) {
            deleteFotoMutation.mutate({ pedidoId: id, fotoId });
        }
    };

    const uploadFotoMutation = useMutation({
        mutationFn: uploadFotoPedidoCliente,
        onSuccess: () => {
            toast.success('Foto enviada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['pedidoCliente', id] });
            setSelectedFile(null); // Limpa o arquivo selecionado
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Falha ao enviar a foto.');
        }
    });

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleFotoSubmit = (e) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.error('Por favor, selecione um arquivo.');
            return;
        }
        const formData = new FormData();
        formData.append('foto', selectedFile, selectedFile.name);
        uploadFotoMutation.mutate({ pedidoId: id, formData });
    };

    const handleSugerirSubmit = (e) => {
        e.preventDefault();
        if (!novaDataSugerida) {
            return toast.error('Por favor, selecione uma data e hora.');
        }
        reagendamentoMutation.mutate({ id, dataSugerida: novaDataSugerida });
    };

    if (isLoading) return <div className="p-8 text-center">A carregar detalhes...</div>;
    if (error || !pedido) return <div className="p-8 text-center text-red-500">Erro: {error?.message || "Pedido não encontrado."}</div>;

    const podeAprovar = pedido.status === 'Pendente' && pedido.valorProposto > 0;
    const podeSugerirAgendamento = pedido.status === 'Aceito' || pedido.status === 'Agendado';

    return (
        <>
            <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
                <div className='flex justify-between items-center'>
                    <Link to="/cliente/dashboard" className="text-blue-600 hover:underline">&larr; Voltar para Meus Pedidos</Link>
                    <button onClick={() => { localStorage.removeItem('clienteToken'); navigate('/cliente/login'); }} className="text-sm text-gray-500 hover:underline">Sair</button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md mt-4">
                    <div className="flex justify-between items-start border-b pb-4 mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Detalhes do Pedido #{pedido.shortId}</h1>
                            <p className="text-sm text-gray-500">Solicitado em: {new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <span className="text-lg font-semibold bg-blue-100 text-blue-800 px-4 py-1 rounded-full">{pedido.status}</span>
                    </div>

                    <div className="space-y-4">
                        <h2 className="font-semibold text-gray-700">Descrição do Serviço:</h2>
                        <p className="text-gray-600 whitespace-pre-wrap">{pedido.descricao}</p>
                    </div>

                    {pedido.valorProposto > 0 && (
                        <div className="mt-4">
                            <h2 className="font-semibold text-gray-700">Valor do Orçamento:</h2>
                            <p className="text-xl font-bold text-green-700">{formatCurrency(pedido.valorProposto)}</p>
                        </div>
                    )}

                    <div className="mt-6 pt-6 border-t">
                        <h2 className="text-lg font-semibold text-gray-800 mb-3">Fotos do Serviço</h2>
                        <div className="mb-4">
                            <form onSubmit={handleFotoSubmit} className="flex items-center space-x-2">
                                <input type="file" onChange={handleFileChange} className="flex-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                <Button type="submit" disabled={uploadFotoMutation.isPending || !selectedFile}>
                                    <Upload size={16} className="mr-2" />
                                    {uploadFotoMutation.isPending ? 'Enviando...' : 'Enviar'}
                                </Button>
                            </form>
                        </div>
                        {pedido.fotosServico?.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {pedido.fotosServico.map(foto => (
                                    <div key={foto._id} className="relative">
                                        <div className="cursor-pointer" onClick={() => setViewingImage(foto.url)}>
                                            <img src={foto.url} alt={foto.descricao || 'Foto do serviço'} className="w-full h-24 object-cover rounded-md" />
                                        </div>
                                        <button onClick={(e) => handleDeleteFoto(e, foto._id)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 transition-opacity">
                                            <X size={12} />
                                        </button>
                                        {foto.descricao && <p className="text-xs text-center mt-1 text-gray-600 truncate">{foto.descricao}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Camera size={32} className="text-slate-400 mx-auto" />
                                <p className="mt-2 text-sm text-gray-500">Nenhuma foto adicionada.</p>
                            </div>
                        )}
                    </div>

                    {podeAprovar && (
                        <div className="mt-6 pt-6 border-t">
                            <h2 className="text-lg font-semibold text-gray-800 mb-3">Ações do Orçamento</h2>
                            <div className="flex space-x-4">
                                <Button onClick={() => actionMutation.mutate({ id, action: 'aprovar' })} disabled={actionMutation.isPending} className="flex-1 bg-green-500 hover:bg-green-600">
                                    {actionMutation.isPending ? 'A processar...' : 'Aprovar Orçamento'}
                                </Button>
                                <Button onClick={() => actionMutation.mutate({ id, action: 'rejeitar' })} disabled={actionMutation.isPending} className="flex-1 bg-red-500 hover:bg-red-600">
                                    {actionMutation.isPending ? 'A processar...' : 'Rejeitar Orçamento'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {podeSugerirAgendamento && (
                        <div className="mt-6 pt-6 border-t">
                            <h2 className="text-lg font-semibold text-gray-800 mb-3">
                                {pedido.status === 'Agendado' ? 'Solicitar Reagendamento' : 'Sugerir Data para o Serviço'}
                            </h2>

                            {pedido.sugestaoAgendamentoCliente && !mostrarFormReagendamento ? (
                                <div className="p-4 bg-green-100 text-green-800 rounded-lg flex justify-between items-center">
                                    <p>
                                        Sua sugestão para <strong>{new Date(pedido.sugestaoAgendamentoCliente).toLocaleString('pt-BR')}</strong> foi enviada.
                                    </p>
                                    <Button variant="outline" onClick={() => setMostrarFormReagendamento(true)}>Alterar</Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSugerirSubmit} className="flex items-end space-x-2">
                                    <input type="datetime-local" onChange={(e) => setNovaDataSugerida(e.target.value)} required className="flex-1 p-2 border rounded-lg" disabled={reagendamentoMutation.isPending} />
                                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={reagendamentoMutation.isPending}>
                                        {reagendamentoMutation.isPending ? 'A enviar...' : 'Enviar Sugestão'}
                                    </Button>
                                    {mostrarFormReagendamento && <Button variant="ghost" type="button" onClick={() => setMostrarFormReagendamento(false)}>Cancelar</Button>}
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {viewingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setViewingImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <img src={viewingImage} alt="Visualização ampliada" className="w-full h-full object-contain" />
                        <button onClick={() => setViewingImage(null)} className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-white text-3xl">&times;</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default PedidoDetalheClientePage;
