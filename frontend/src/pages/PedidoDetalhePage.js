import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrcamento, deletePedido, deleteFotoPedido, agendarPedido, updatePedidoStatus, submitOrcamento, addMaterialToOrcamento, getPortalLink } from '../api/pedidosApi';
import {
    Printer, Share2, Trash2, Check, Calendar, ThumbsUp, Plus, PlusCircle, Link as LinkIcon
} from 'lucide-react';
import KanbanSkeleton from '../components/skeletons/KanbanSkeleton';
import ActionPanel from '../components/pedidos/ActionPanel';
import AddPaymentToOrderModal from '../components/modals/AddPaymentToOrderModal';
import AddTaskModal from '../components/modals/AddTaskModal';
import AddPhotoModal from '../components/modals/AddPhotoModal';
import AddMaterialModal from '../components/modals/AddMaterialModal';
import SendMessageModal from '../components/modals/SendMessageModal.js';
import CalculadoraOrcamentoModal from '../components/modals/CalculadoraOrcamentoModal.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { atualizarTarefa, removerTarefa } from '../api/checklistApi';
import { removeMaterialFromPedido } from '../api/produtosApi';


// --- Helper Functions ---
const formatCurrency = (value) => {
    if (typeof value !== 'number') return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const getNumericValue = (value) => {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'object' && value !== null && value.$numberDecimal) {
        return parseFloat(value.$numberDecimal);
    }
    const parsed = parseFloat(value);
    return !isNaN(parsed) ? parsed : 0;
};

const formatDate = (dateString) => {
    if (!dateString) return { date: 'N/A', time: '' };
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
};

const statusBadgeInfo = {
    'Pendente':   'bg-yellow-100 text-yellow-800 border border-yellow-200',
    'Aceito':     'bg-blue-100 text-blue-800 border border-blue-200',
    'Agendado':   'bg-green-100 text-green-800 border border-green-200',
    'Finalizado': 'bg-slate-200 text-slate-800 border border-slate-300',
    'Rejeitado':  'bg-red-100 text-red-800 border border-red-200',
};


const TimelineIcon = ({ status }) => {
    const icons = {
        'Finalizado': <Check size={16} />,
        'Agendado': <Calendar size={14} />,
        'Aceito': <ThumbsUp size={14} />,
        'Pendente': <Plus size={16} />,
    };
    const colors = {
        'Finalizado': 'bg-green-500',
        'Agendado': 'bg-blue-500',
        'Aceito': 'bg-blue-500',
        'Pendente': 'bg-blue-500',
    };
    const icon = icons[status] || <Plus size={16} />;
    const color = colors[status] || 'bg-gray-500';

    return (
        <div className={`absolute -left-[35px] top-1 h-6 w-6 rounded-full ${color} flex items-center justify-center text-white`}>
            {icon}
        </div>
    );
};

// --- Main Component ---
const PedidoDetalhePage = () => {
    const { id } = useParams();
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isTaskModalOpen, setTaskModalOpen] = useState(false);
    const [isPhotoModalOpen, setPhotoModalOpen] = useState(false);
    const [isMaterialModalOpen, setMaterialModalOpen] = useState(false);
    const [isSendMessageModalOpen, setSendMessageModalOpen] = useState(false);
    const [isCalculatorModalOpen, setCalculatorModalOpen] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);
    const [portalLink, setPortalLink] = useState('');
    const [isLinkModalOpen, setLinkModalOpen] = useState(false);
    const { usuario } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const deleteFotoMutation = useMutation({
        mutationFn: deleteFotoPedido,
        onSuccess: () => {
            toast.success('Foto excluída com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleDeleteFoto = (e, fotoId) => {
        e.stopPropagation(); // Impede que o modal de visualização seja aberto
        if (window.confirm('Tem certeza que deseja excluir esta foto?')) {
            deleteFotoMutation.mutate({ pedidoId: id, fotoId });
        }
    };

    const deleteMutation = useMutation({
        mutationFn: deletePedido,
        onSuccess: () => {
            toast.success('Pedido excluído com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            navigate('/pedidos');
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleDelete = () => {
        if (window.confirm('Tem certeza que deseja excluir este pedido? Esta ação é irreversível.')) {
            deleteMutation.mutate(pedido._id);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    // --- Handlers for ActionPanel ---
    const handleAnalyze = () => {
        setCalculatorModalOpen(true);
    };

    const applyPriceMutation = useMutation({
        mutationFn: submitOrcamento,
        onSuccess: () => {
            toast.success('Preço atualizado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
        },
        onError: (error) => {
            toast.error(error.message || 'Falha ao atualizar o preço.');
        }
    });

    const addMaterialMutation = useMutation({
        mutationFn: addMaterialToOrcamento,
        onSuccess: () => {
            // Invalida a query do orçamento para buscar os dados atualizados
            queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
        },
        onError: (error) => {
            toast.error(error.message || 'Falha ao adicionar material.');
        }
    });

    const handleApplyCalculation = (calculation) => {
        const { price, materials } = calculation;

        if (price > 0) {
            applyPriceMutation.mutate({ pedidoId: id, valorProposto: price });
        } else {
            toast.error('O preço calculado é inválido.');
        }

        if (materials && materials.length > 0) {
            materials.forEach(material => {
                const materialData = {
                    produtoId: material.produtoId,
                    quantidade: material.quantidade,
                    custoUnitario: material.custoUnitario,
                    descricao: material.nome,
                };
                addMaterialMutation.mutate({ orcamentoId: id, materialData });
            });
            toast.success(`${materials.length} material(ns) adicionado(s) ao pedido.`);
        }
        
        setCalculatorModalOpen(false);
    };

    const scheduleMutation = useMutation({
        mutationFn: agendarPedido,
        onSuccess: () => {
            toast.success('Pedido agendado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
        },
        onError: (error) => toast.error(error.message),
    });

    const updateStatusMutation = useMutation({
        mutationFn: updatePedidoStatus,
        onSuccess: () => {
            toast.success('Status do pedido atualizado!');
            queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
        },
        onError: (error) => toast.error(error.message),
    });

    const handleSchedule = (date, period) => {
        if (!period) {
            toast.error("Por favor, selecione um período (manhã ou tarde).");
            return;
        }
        scheduleMutation.mutate({ pedidoId: id, dataAgendamento: date, periodo: period });
    };

    const handleAccept = () => {
        updateStatusMutation.mutate({ pedidoId: id, newStatus: 'Aceito' });
    };

    const handleConfirm = () => {
        updateStatusMutation.mutate({ pedidoId: id, newStatus: 'Finalizado' });
    };

    const handleReschedule = () => {
        updateStatusMutation.mutate({ pedidoId: id, newStatus: 'Aceito' });
    };

    const handleArchive = () => {
        console.log("TODO: Implement archive logic");
        toast("Funcionalidade de arquivamento ainda não implementada.");
    };

    const handleGenerateLink = async () => {
        try {
            const data = await getPortalLink(id);
            setPortalLink(data.portalUrl);
            setLinkModalOpen(true);
        } catch (error) {
            toast.error(error.message || 'Falha ao gerar o link de pagamento.');
        }
    };

    const { data: pedido, isLoading: isLoadingPedido, isError: isErrorPedido, error: errorPedido } = useQuery({
        queryKey: ['orcamento', id],
        queryFn: () => getOrcamento(id),
        enabled: !!id,
    });

    const updateTaskMutation = useMutation({
        mutationFn: atualizarTarefa,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
            toast.success('Tarefa atualizada!');
        },
        onError: (error) => toast.error(error.message),
    });

    const deleteTaskMutation = useMutation({
        mutationFn: removerTarefa,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
            toast.success('Tarefa removida!');
        },
        onError: (error) => toast.error(error.message),
    });

    const removeMaterialMutation = useMutation({
        mutationFn: removeMaterialFromPedido,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orcamento', id] });
            toast.success('Material removido!');
        },
        onError: (error) => toast.error(error.message),
    });

    const handleToggleTask = (tarefaId, concluida) => {
        updateTaskMutation.mutate({ pedidoId: id, tarefaId, concluida: !concluida });
    };

    const handleDeleteTask = (tarefaId) => {
        if (window.confirm('Tem certeza que deseja remover esta tarefa?')) {
            deleteTaskMutation.mutate({ pedidoId: id, tarefaId });
        }
    };

    const handleRemoveMaterial = (materialUsadoId) => {
        if (window.confirm('Tem certeza que deseja remover este material?')) {
            removeMaterialMutation.mutate({ pedidoId: id, materialUsadoId });
        }
    };

    const { custosTotais, lucroBruto, saldoDevedorCalculado } = useMemo(() => {
        if (!pedido) return { custosTotais: 0, lucroBruto: 0, saldoDevedorCalculado: 0 };
        
        const valorPropostoNum = getNumericValue(pedido.valorProposto);
        
        const custosDeEstoque = pedido.materiaisUsados?.reduce((acc, item) => acc + (getNumericValue(item.custoNoMomento) * getNumericValue(item.quantidade)), 0) || 0;
        const custosManuais = pedido.custosMateriais?.reduce((acc, custo) => acc + getNumericValue(custo.valor), 0) || 0;
        const custosTotaisCalc = custosDeEstoque + custosManuais;
        
        const lucroBrutoCalc = valorPropostoNum - custosTotaisCalc;
        
        const totalPago = pedido.pagamentos?.reduce((acc, p) => acc + getNumericValue(p.valor), 0) || 0;
        const saldoDevedor = valorPropostoNum - totalPago;

        return { custosTotais: custosTotaisCalc, lucroBruto: lucroBrutoCalc, saldoDevedorCalculado: saldoDevedor };
    }, [pedido]);

    if (isLoadingPedido) {
        return <div className="p-8"><KanbanSkeleton /></div>;
    }

    if (isErrorPedido) {
        return <div className="p-8 text-center text-red-500">Erro ao carregar o pedido: {errorPedido.message}</div>;
    }

    if (!pedido) {
        return <div className="p-8 text-center">Pedido não encontrado.</div>;
    }

    const cliente = pedido?.cliente;
    const valorPropostoNum = getNumericValue(pedido.valorProposto);

    const enderecoCompleto = [cliente?.endereco?.logradouro, cliente?.endereco?.numero, cliente?.endereco?.bairro].filter(Boolean).join(', ');
    const cidadeEstado = [cliente?.endereco?.cidade, cliente?.endereco?.estado].filter(Boolean).join(' / ');
    
    const materiaisParaCalculadora = pedido.materiaisUsados?.map(item => ({
        qtd: item.quantidade,
        precoUnit: item.custoNoMomento,
    })) || [];

    return (
        <>
            <div className="p-4 sm:p-6 md:p-8 bg-slate-100 font-sans">
                <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                    {/* Cabeçalho Principal */}
                    <header className="p-6 bg-slate-50 border-b border-slate-200">
                        <div className="flex flex-wrap justify-between items-start gap-4">
                            <div>
                                <h1 className="text-3xl font-extrabold text-slate-800">Pedido #{pedido.shortId}</h1>
                                <p className="text-slate-500 mt-1">{pedido.descricaoServico || 'Serviço não descrito'} para <span className="font-semibold text-slate-700">{cliente?.nome || 'N/A'}</span></p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`status-badge text-sm font-bold py-1.5 px-4 rounded-full ${statusBadgeInfo[pedido.status] || statusBadgeInfo['Pendente']}`}>
                                    {pedido.status}
                                </span>
                                <button onClick={handlePrint} className="text-slate-500 hover:text-blue-600 h-9 w-9 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"><Printer size={20} /></button>
                                <button onClick={handleDelete} className="text-slate-500 hover:text-red-600 h-9 w-9 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"><Trash2 size={20} /></button>
                            </div>
                        </div>
                    </header>

                    {/* Corpo Principal */}
                    <main className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-10 p-6 md:p-8">
                        
                        {/* Coluna Esquerda: Ações e Detalhes */}
                        <div className="lg:col-span-2 space-y-8">
                            <ActionPanel
                                pedido={pedido}
                                onAnalyze={handleAnalyze}
                                onSchedule={handleSchedule}
                                onConfirm={handleConfirm}
                                onArchive={handleArchive}
                                onAccept={handleAccept}
                                onReschedule={handleReschedule}
                            />

                            {/* Comunicação */}
                            <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-4">Comunicação com Cliente</h2>
                                <div className="card p-6">
                                    <p className="text-slate-600 text-sm mb-4">Use os botões abaixo para se comunicar com o cliente. Você pode enviar mensagens rápidas ou gerar um link de pagamento seguro para que o cliente possa pagar online.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button onClick={() => setSendMessageModalOpen(true)} className="w-full bg-green-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30 flex items-center justify-center">
                                            <Share2 className="mr-2" size={16} /> Enviar Mensagem
                                        </button>
                                        {usuario?.mercadoPagoConnected && (
                                            <button onClick={handleGenerateLink} className="w-full bg-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30 flex items-center justify-center">
                                                <LinkIcon className="mr-2" size={16} /> Gerar Link de Pagamento
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Execução e Materiais */}
                            <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-4">Execução e Materiais</h2>
                                <div className="card p-6">
                                    <div className="flex justify-between items-center mb-4">
                                       <h3 className="font-semibold text-slate-700">Checklist de Execução</h3>
                                       <button onClick={() => setTaskModalOpen(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-800"><Plus className="inline-block mr-1" size={14} /> Adicionar Tarefa</button>
                                    </div>
                                    {pedido.checklist?.length > 0 ? (
                                        <ul className="space-y-3 border-b pb-4">
                                            {pedido.checklist.map(task => (
                                                <li key={task._id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={task.concluida}
                                                            onChange={() => handleToggleTask(task._id, task.concluida)}
                                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                        <span className={`ml-3 text-sm ${task.concluida ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{task.descricao}</span>
                                                    </div>
                                                    <button onClick={() => handleDeleteTask(task._id)} className="text-gray-400 hover:text-red-600">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-center text-slate-500 py-4 border-b">
                                            Nenhuma tarefa no checklist.
                                        </div>
                                    )}
                                     <div className="flex justify-between items-center mt-4 mb-4">
                                       <h3 className="font-semibold text-slate-700">Controle de Materiais</h3>
                                       <button onClick={() => setMaterialModalOpen(true)} className="text-sm font-semibold text-blue-600 hover:text-blue-800"><Plus className="inline-block mr-1" size={14}/> Adicionar Material</button>
                                    </div>
                                    {pedido.materiaisUsados?.length > 0 ? (
                                        <ul className="space-y-2">
                                            {pedido.materiaisUsados.map(material => (
                                                <li key={material._id} className="flex justify-between items-center text-sm text-slate-600 p-2 hover:bg-slate-100 rounded-md group">
                                                    <div>
                                                        <span>({material.quantidade}x) {material.produto?.nome}</span>
                                                        <span className="ml-2 text-xs text-slate-400">({formatCurrency(material.custoNoMomento)}/un)</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{formatCurrency(material.custoNoMomento * material.quantidade)}</span>
                                                        <button onClick={() => handleRemoveMaterial(material._id)} className="text-slate-500 hover:text-red-600 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                     ) : (
                                        <div className="text-center text-slate-500 py-4">
                                            Nenhum material alocado.
                                        </div>
                                    )}
                                </div>
                            </section>

                             {/* Fotos do Serviço */}
                            <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-4">Fotos do Serviço</h2>
                                <div className="card p-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {pedido.fotosServico?.map(foto => (
                                            <div key={foto._id} className="relative group aspect-square">
                                                <img src={foto.url} alt={foto.descricao || 'Foto do serviço'} className="w-full h-full object-cover rounded-lg cursor-pointer" onClick={() => setViewingImage(foto.url)} />
                                               <button onClick={(e) => handleDeleteFoto(e, foto._id)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        <button onClick={() => setPhotoModalOpen(true)} className="aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 hover:border-blue-500 transition-colors">
                                            <Plus size={24} />
                                            <span className="text-xs font-semibold mt-1">Adicionar Foto</span>
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Coluna Direita: Resumo */}
                        <aside className="lg:col-span-1 space-y-8">
                             <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-4">Resumo Financeiro</h2>
                                <div className="card p-6 space-y-4 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Valor Total do Pedido</span>
                                        <span className="font-bold text-slate-800 text-base">{formatCurrency(valorPropostoNum)}</span>
                                    </div>
                                     <div className="flex justify-between items-center">
                                        <span className="text-slate-600">Custos Totais</span>
                                        <span className="font-bold text-slate-800 text-base">- {formatCurrency(custosTotais)}</span>
                                    </div>
                                    <div className="border-t pt-4 flex justify-between items-center">
                                        <span className="font-semibold text-slate-700">Lucro Bruto</span>
                                        <span className="font-extrabold text-green-600 text-lg">{formatCurrency(lucroBruto)}</span>
                                    </div>
                                    <hr />
                                     <div className="flex justify-between items-center pt-2">
                                        <span className="font-semibold text-slate-700">Saldo Devedor Cliente</span>
                                        <span className="font-extrabold text-red-600 text-lg">{formatCurrency(saldoDevedorCalculado)}</span>
                                    </div>
                                     <button onClick={() => setPaymentModalOpen(true)} className="w-full bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors">
                                        <PlusCircle className="inline-block mr-2" size={16} /> Adicionar Pagamento
                                    </button>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-4">Progresso do Pedido</h2>
                                <div className="card p-6">
                                    <div className="border-l-2 border-slate-200 pl-6 space-y-6">
                                        {pedido.historico?.length > 0 ? (
                                            pedido.historico.sort((a, b) => new Date(b.data) - new Date(a.data)).map((item, index) => (
                                                <div key={index} className="relative">
                                                    <TimelineIcon status={item.status} />
                                                    <p className="font-semibold text-slate-800">{item.evento || `Status alterado para ${item.status}`}</p>
                                                    <p className="text-sm text-slate-500">{formatDate(item.data).date}, {formatDate(item.data).time}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-slate-500">Nenhum histórico de progresso.</p>
                                        )}
                                    </div>
                                </div>
                            </section>
                            
                             <section>
                                <h2 className="text-xl font-bold text-slate-800 mb-4">Dados do Cliente</h2>
                                <div className="card p-6 space-y-3 text-sm">
                                    <div>
                                        <p className="font-semibold text-slate-500">NOME</p>
                                        <p className="font-bold text-slate-800">{cliente?.nome || 'Não informado'}</p>
                                    </div>
                                     <div>
                                        <p className="font-semibold text-slate-500">TELEFONE</p>
                                        <p className="font-bold text-slate-800">{cliente?.telefone || 'Não informado'}</p>
                                    </div>
                                     <div>
                                        <p className="font-semibold text-slate-500">ENDEREÇO</p>
                                        <p className="font-bold text-slate-800">{enderecoCompleto || 'Não informado'}, {cidadeEstado}</p>
                                    </div>
                                </div>
                            </section>
                        </aside>
                    </main>
                </div>
            </div>
            <AddPaymentToOrderModal isOpen={isPaymentModalOpen} onClose={() => setPaymentModalOpen(false)} pedido={pedido} />
            <AddTaskModal isOpen={isTaskModalOpen} onClose={() => setTaskModalOpen(false)} pedidoId={id} />
            <AddPhotoModal isOpen={isPhotoModalOpen} onClose={() => setPhotoModalOpen(false)} pedidoId={id} />
            <AddMaterialModal isOpen={isMaterialModalOpen} onClose={() => setMaterialModalOpen(false)} pedidoId={id} />
            <SendMessageModal
                isOpen={isSendMessageModalOpen}
                onClose={() => setSendMessageModalOpen(false)}
                pedido={pedido}
            />

            <CalculadoraOrcamentoModal
                isOpen={isCalculatorModalOpen}
                onClose={() => setCalculatorModalOpen(false)}
                materiais={materiaisParaCalculadora}
                onApplyCalculation={handleApplyCalculation}
            />

            {isLinkModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-slate-800">Link de Pagamento Gerado</h3>
                        <p className="text-sm text-slate-600 mt-2">Envie o link abaixo para o seu cliente realizar o pagamento.</p>
                        <div className="mt-4 bg-slate-100 p-3 rounded-md">
                            <input
                                type="text"
                                value={portalLink}
                                readOnly
                                className="w-full bg-transparent text-sm text-slate-700 outline-none"
                            />
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(portalLink);
                                    toast.success('Link copiado!');
                                }}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-semibold"
                            >
                                Copiar
                            </button>
                            <button
                                onClick={() => setLinkModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 font-semibold"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewingImage && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setViewingImage(null)}>
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <img src={viewingImage} alt="Visualização ampliada" className="max-w-[90vw] max-h-[90vh] object-contain" />
                        <button onClick={() => setViewingImage(null)} className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-white text-3xl">&times;</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default PedidoDetalhePage;
