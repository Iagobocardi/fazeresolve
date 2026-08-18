import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils.js';
import * as chrono from 'chrono-node';
import { getOrcamento, deletePedido } from '../../api/pedidosApi.js';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { updatePedidoStatus, submitOrcamento, addPagamento, agendarPedido } from '../../api/pedidosApi.js';
import ConfirmModal from '../ui/ConfirmModal.js';
import { marcarComoPago } from '../../api/pedidosApi.js';
import Checklist from '../pedidos/Checklist.js';
import apiClient from '../../api/apiClient';
import { getConfiguracao } from '../../api/configuracaoApi.js';
import { calcularPreco } from '../../api/utilsApi.js';
import WhatsappReminderModal from '../modals/WhatsappReminderModal.js';
import EnviarCobrancaModal from '../modals/EnviarCobrancaModal.js';
import AbaGeral from './AbaGeral.js';
import AbaFinanceiro from './AbaFinanceiro.js';
import AbaOperacional from './AbaOperacional.js';
import AbaDocumentos from './AbaDocumentos.js';
import Timeline from './Timeline.js';
import ResumoFinanceiro from './ResumoFinanceiro.js';
import AcoesPrincipais from './AcoesPrincipais.js';
import ScheduleForm from './ScheduleForm.js';

// --- Ícones ---
const X = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> );
const Trash2 = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg> );
const Link = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg> );

// --- Subcomponentes ---
const TabNav = ({ tabs, activeTab, setActiveTab }) => (
    <nav className="flex border-b mt-4">
        {tabs.map(tab => (
            <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 text-gray-500 border-b-2 border-transparent hover:text-blue-600 ${activeTab === tab ? 'border-blue-600 text-blue-600 font-semibold' : ''}`}
            >
                {tab}
            </button>
        ))}
    </nav>
);

const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

const formatSuggestedDate = (dateString) => {
    if (!dateString) return 'Nenhuma';
    if (isValidDate(dateString)) {
        return new Date(dateString).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }
    return dateString;
};

// --- Componente Principal ---
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

export default function PedidoModal({ pedido: initialPedido, onClose, onUpdate, }) {
    const queryClient = useQueryClient();

    const { data: orcamento, isLoading: isLoadingOrcamento } = useQuery({
        queryKey: ['orcamento', initialPedido?._id],
        queryFn: () => getOrcamento(initialPedido._id),
        enabled: !!initialPedido?._id,
    });

    const pedido = orcamento || initialPedido;

    const { data: config } = useQuery({
        queryKey: ['configuracao'],
        queryFn: getConfiguracao,
        staleTime: Infinity,
    });

    const isSugestaoValida = useMemo(() => {
        if (!pedido?.sugestaoAgendamentoCliente) return false;
        if (isValidDate(pedido.sugestaoAgendamentoCliente)) return true;
        return !!chrono.parseDate(pedido.sugestaoAgendamentoCliente, new Date(), { forwardDate: true });
    }, [pedido?.sugestaoAgendamentoCliente]);

    const [notas, setNotas] = useState('');
    const [saveStatus, setSaveStatus] = useState('idle');
    const [valorProposto, setValorProposto] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [novoValor, setNovoValor] = useState('');
    const [novoMetodo, setNovoMetodo] = useState('Pix');
    const [novaObservacao, setNovaObservacao] = useState('');
    const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
    const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
    const [quantidadeUsada, setQuantidadeUsada] = useState(1);
    const [isAddingMaterial, setIsAddingMaterial] = useState(false);
    const [anotacoes, setAnotacoes] = useState('');
    const [lembreteNF, setLembreteNF] = useState('');
    const [custoDescricao, setCustoDescricao] = useState('');
    const [custoValor, setCustoValor] = useState('');
    const [custoTipo, setCustoTipo] = useState('Fixo');
    const [confirmation, setConfirmation] = useState({ isOpen: false });
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [mostrarCalculadora, setMostrarCalculadora] = useState(false);
    const [horasEstimadas, setHorasEstimadas] = useState(0);
    const [custoHora, setCustoHora] = useState(50);
    const [margemLucro, setMargemLucro] = useState(100);
    const [custoTerceiros, setCustoTerceiros] = useState(0);
    const [precoSugerido, setPrecoSugerido] = useState(null);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [isCobrancaModalOpen, setIsCobrancaModalOpen] = useState(false);
    const [categoria, setCategoria] = useState('');
    const [activeTab, setActiveTab] = useState('Geral');
    const TABS = ['Geral', 'Financeiro', 'Operacional', 'Plano de Execução', 'Documentos e Histórico'];

    const { data: categories } = useQuery({
        queryKey: ['orcamentoCategorias'],
        queryFn: () => apiClient.get('/orcamentos/dados/categorias').then(res => res.data),
    });

    const addPagamentoMutation = useMutation({
        mutationFn: addPagamento,
        onSuccess: () => {
            toast.success('Pagamento adicionado!');
            setNovoValor('');
            setNovaObservacao('');
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        },
        onError: (err) => toast.error(err.message),
    });

    const handleAddPagamento = (e) => {
        e.preventDefault();
        const paymentData = {
            valor: parseFloat(novoValor),
            metodo: novoMetodo,
            observacao: novaObservacao,
        };
        addPagamentoMutation.mutate({ pedidoId: pedido._id, paymentData });
    };
    
    const handleRemovePagamento = async (pagamentoId) => {
        if (!window.confirm("Tem a certeza que deseja remover este pagamento?")) return;
        try {
            await apiClient.delete(`/orcamentos/${pedido._id}/pagamentos/${pagamentoId}`);
            toast.success('Pagamento removido!');
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Não foi possível remover o pagamento.');
        }
    };

    const handleSaveNotas = async () => {
        setSaveStatus('saving');
        try {
            await apiClient.patch(`/orcamentos/${pedido._id}/notas`, { notasInternas: notas });
            toast.success('Notas salvas com sucesso!');
            setSaveStatus('saved');
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Falha ao salvar as notas.');
            setSaveStatus('idle');
        }
    };

    const handleDelete = () => {
        setConfirmation({
            isOpen: true,
            title: "Confirmar Exclusão",
            message: "Tem a certeza que deseja excluir este pedido? Esta ação é irreversível.",
            onConfirm: () => {
                deleteMutation.mutate(pedido._id);
                setConfirmation({ isOpen: false });
            }
        });
    };

    const handleCopyPublicLink = async () => {
        const publicUrl = `${window.location.origin}/status/${pedido.publicId}`;
        try {
            await navigator.clipboard.writeText(publicUrl);
            toast.success('Link de acompanhamento copiado!');
        } catch (err) {
            console.error('Falha ao copiar o link: ', err);
            toast.error('Não foi possível copiar o link.');
        }
    };

    const handleUpdateStatus = (newStatus) => {
        if (newStatus === 'Finalizado') {
            setConfirmation({
                isOpen: true,
                title: "Confirmar Finalização",
                message: "Tem a certeza que deseja marcar este pedido como finalizado?",
                onConfirm: () => {
                    updateStatusMutation.mutate({ pedidoId: pedido._id, newStatus });
                    setConfirmation({ isOpen: false });
                }
            });
        } else {
            updateStatusMutation.mutate({ pedidoId: pedido._id, newStatus });
        }
    };

    const handleSchedule = (suggestion) => {
        setIsSubmitting(true);
        let finalDate = null;

        if (suggestion instanceof Date) {
            finalDate = suggestion;
        } else if (typeof suggestion === 'string') {
            if (isValidDate(suggestion)) {
                finalDate = new Date(suggestion);
            } else {
                const parsedDate = chrono.parseDate(suggestion, new Date(), { forwardDate: true });
                if (parsedDate) {
                    finalDate = parsedDate;
                }
            }
        }

        if (!finalDate) {
            toast.error(`Não foi possível entender a sugestão: "${suggestion}". Por favor, agende uma data e hora específicas.`);
            setIsSubmitting(false);
            return;
        }
        agendarPedidoMutation.mutate({ pedidoId: pedido._id, dataAgendamento: finalDate.toISOString() });
        setIsSubmitting(false);
    };

    const handleAdicionarMaterial = async (e) => {
        e.preventDefault();
        if (!produtoSelecionadoId || !quantidadeUsada || quantidadeUsada <= 0) {
            toast.error('Selecione um produto e uma quantidade válida.');
            return;
        }
        setIsAddingMaterial(true);
        try {
            await apiClient.post(`/orcamentos/${pedido._id}/materiais`, { produtoId: produtoSelecionadoId, quantidade: quantidadeUsada });
            toast.success('Material adicionado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            setQuantidadeUsada(1);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Falha ao adicionar material.');
        } finally {
            setIsAddingMaterial(false);
        }
    };

    const handleRemoveMaterial = async (materialUsadoId) => {
        if (!window.confirm("Tem a certeza que deseja remover este material do pedido?")) return;
        try {
            await apiClient.delete(`/orcamentos/${pedido._id}/materiais/${materialUsadoId}`);
            toast.success('Material removido com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Falha ao remover material.');
        }
    };

    const handleSalvarDetalhesOperacionais = async () => {
        try {
            await apiClient.patch(`/orcamentos/${pedido._id}/operacional`, { anotacoesTecnicas: anotacoes, lembreteNotaFiscal: lembreteNF });
            toast.success('Detalhes operacionais salvos!');
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Falha ao salvar detalhes.');
        }
    };

    const handleAdicionarCusto = async (e) => {
        e.preventDefault();
        if (!custoDescricao || !custoValor || parseFloat(custoValor) <= 0) {
            toast.error('Preencha a descrição e um valor válido para o custo.');
            return;
        }
        try {
            await apiClient.post(`/orcamentos/${pedido._id}/custos`, { descricao: custoDescricao, valor: parseFloat(custoValor), tipo: custoTipo });
            toast.success('Custo adicionado!');
            setCustoDescricao('');
            setCustoValor('');
            setCustoTipo('Fixo');
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Falha ao adicionar custo.')
        }
    };

    const handleRemoveCusto = async (custoId) => {
        if (!window.confirm("Tem a certeza que deseja remover este custo?")) return;
        try {
            await apiClient.delete(`/orcamentos/${pedido._id}/custos/${custoId}`);
            toast.success('Custo removido com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Não foi possível remover o custo.');
        }
    };

    const handleFotoSubmit = async (e) => {
        e.preventDefault();
        const file = e.target.foto.files[0];
        const descricao = e.target.descricao.value;
        if (!file) { toast.error('Por favor, selecione um ficheiro.'); return; }
        const formData = new FormData();
        formData.append('foto', file);
        formData.append('descricao', descricao);
        try {
            await apiClient.post(`/orcamentos/${pedido._id}/upload-foto`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Foto enviada com sucesso!');
            e.target.reset();
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Falha no upload da foto.')
        }
    };

    const handleSendWhatsAppMessage = (tipo) => {
        if (!pedido || !config) return;

        const telefoneCliente = pedido.cliente?.telefone.replace(/\D/g, '');
        const nomeCliente = pedido.cliente?.nome.split(' ')[0];
        
        let textoMensagem = '';

        if (tipo === 'orcamento') {
            const valorFormatado = formatCurrency(valorProposto);
            const linkPortal = `${window.location.origin}/status/${pedido.publicId}`;
            textoMensagem = `Olá, ${nomeCliente}! Segue o seu orçamento da ${config.nomeEmpresa}:\n\n*Serviço:* ${pedido.descricao}\n*Valor:* ${valorFormatado}\n\nPara ver os detalhes completos e aprovar, acesse o seu portal seguro:\n${linkPortal}`;
        }

        const textoEncode = encodeURIComponent(textoMensagem);

        if (config.whatsappMode === 'completo') {
            console.log("MODO COMPLETO: Enviando API call para o backend.");
            toast.success("Funcionalidade de envio automático a ser implementada!");
        } else {
            const whatsappUrl = `https://wa.me/55${telefoneCliente}?text=${textoEncode}`;
            window.open(whatsappUrl, '_blank');
        }
    };

    const handleSugerirPreco = async () => {
        try {
            const custoMateriais = pedido.materiaisUsados?.reduce((acc, item) => acc + (getNumericValue(item.custoNoMomento) * getNumericValue(item.quantidade)), 0) || 0;
            const calculationPayload = {
                custoMateriais,
                custoTerceiros: parseFloat(custoTerceiros) || 0,
                horasEstimadas: parseFloat(horasEstimadas) || 0,
                custoHora: parseFloat(custoHora) || 0,
                margemLucro: parseFloat(margemLucro) || 0,
            };

            const response = await calcularPreco(calculationPayload);
            const suggestedPrice = response.precoSugerido;

            setValorProposto(suggestedPrice);
            setPrecoSugerido(suggestedPrice);
            toast.success('Preço sugerido calculado!');

            // If it's an existing order, save the new price and parameters
            if (pedido._id) {
                const updatePayload = {
                    valorProposto: suggestedPrice,
                    horasEstimadas: calculationPayload.horasEstimadas,
                    custoHora: calculationPayload.custoHora,
                    margemLucro: calculationPayload.margemLucro,
                    custoTerceiros: calculationPayload.custoTerceiros,
                };
                await apiClient.patch(`/orcamentos/${pedido._id}`, updatePayload);
                toast.success('Cálculo salvo com sucesso no pedido!');
                queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
            }
        } catch (error) {
            toast.error(error.message || 'Não foi possível calcular e salvar o preço.');
        }
    };
    
    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const toastId = toast.loading('A enviar nota fiscal...');

        try {
            const formData = new FormData();
            formData.append('invoice', file);

            const uploadResponse = await apiClient.post('/upload/invoice-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { imageUrl } = uploadResponse.data;

            await apiClient.patch(`/orcamentos/${pedido._id}/attach-invoice`, {
                imageUrl: imageUrl
            });

            toast.success('Nota fiscal anexada com sucesso!', { id: toastId });
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
        } catch (error) {
            console.error("Erro ao anexar nota fiscal:", error);
            toast.error(error.response?.data?.message || 'Falha ao anexar a nota fiscal.', { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };
   
    const handleAttachClick = () => {
        fileInputRef.current.click();
    };

    const deleteMutation = useMutation({
        mutationFn: deletePedido,
        onSuccess: () => {
            toast.success('Pedido excluído com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            onClose();
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const agendarPedidoMutation = useMutation({
        mutationFn: agendarPedido,
        onSuccess: () => {
            toast.success('Agendamento salvo com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
            onClose();
        },
        onError: (err) => toast.error(err.message),
    });

    const updateStatusMutation = useMutation({
        mutationFn: updatePedidoStatus,
        onSuccess: (data) => {
            toast.success(`Pedido movido para "${data.status}"!`);
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            onClose();
        },
        onError: (err) => toast.error(err.message)
    });

    const submitOrcamentoMutation = useMutation({
        mutationFn: submitOrcamento,
        onSuccess: () => {
            toast.success('Orçamento enviado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            onClose();
        },
        onError: (err) => toast.error(err.message)
    });

    const handleSubmitOrcamento = (e) => {
        e.preventDefault();
        if (!valorProposto || parseFloat(valorProposto) <= 0) {
            toast.error("Por favor, insira um valor de orçamento válido.");
            return;
        }
        submitOrcamentoMutation.mutate({
            pedidoId: pedido._id,
            valorProposto
        });
    };

    const marcarPagoMutation = useMutation({
        mutationFn: marcarComoPago,
        onSuccess: () => {
            toast.success("Pedido liquidado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            onClose();
        },
        onError: (err) => toast.error(err.message),
    });

    const handleMarcarComoPago = () => {
        marcarPagoMutation.mutate(pedido._id);
    };

    const updateCategoriaMutation = useMutation({
        mutationFn: (newCategoria) => apiClient.put(`/orcamentos/${pedido._id}`, { categoria: newCategoria }),
        onSuccess: () => {
            toast.success('Categoria atualizada!');
            queryClient.invalidateQueries({ queryKey: ['orcamento', pedido._id] });
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Falha ao atualizar categoria.');
        }
    });

    const handleCategoriaBlur = () => {
        if (categoria !== (pedido.categoria || '')) {
            updateCategoriaMutation.mutate(categoria);
        }
    };

    useEffect(() => {
        if (pedido) {
            setValorProposto(pedido.valorProposto ? String(pedido.valorProposto) : '');
            setNotas(pedido.notasInternas || '');
            setAnotacoes(pedido.anotacoesTecnicas || '');
            setLembreteNF(pedido.lembreteNotaFiscal || '');
            setCategoria(pedido.categoria || '');
            const fetchProdutos = async () => {
                try {
                    const response = await apiClient.get('/produtos');
                    setProdutosDisponiveis(response.data);
                    if (response.data.length > 0) { setProdutoSelecionadoId(response.data[0]._id); }
                } catch (error) { 
                    console.error("Erro ao buscar produtos para o modal:", error);
                    toast.error("Não foi possível carregar os produtos do estoque.");
                }
            };
            fetchProdutos();
        }
    }, [pedido]);

    useEffect(() => {
        if (mostrarCalculadora && pedido) {
            setHorasEstimadas(pedido.horasEstimadas || 0);
            setCustoHora(pedido.custoHora || 50);
            setMargemLucro(pedido.margemLucro || 100);
            setCustoTerceiros(pedido.custoTerceiros || 0);
        }
    }, [mostrarCalculadora, pedido]);

    const { saldoDevedor, custosTotais, lucroReal, custosFixos, custosEstimados } = useMemo(() => {
        if (!pedido) {
            return { saldoDevedor: 0, custosTotais: 0, lucroReal: 0, custosFixos: 0, custosEstimados: 0 };
        }
        const valorPropostoNum = getNumericValue(pedido.valorProposto) || 0;
        const totalPagoCalc = pedido.pagamentos?.reduce((acc, p) => acc + getNumericValue(p.valor), 0) || 0;
        const saldoDevedorCalc = valorPropostoNum - totalPagoCalc;
        
        const custosDeEstoque = pedido.materiaisUsados?.reduce((acc, item) => acc + (getNumericValue(item.custoNoMomento) * getNumericValue(item.quantidade)), 0) || 0;
        
        let custosFixosCalc = custosDeEstoque;
        let custosEstimadosCalc = 0;

        pedido.custosMateriais?.forEach(custo => {
            const valor = getNumericValue(custo.valor);
            if (custo.tipo === 'Estimado') {
                custosEstimadosCalc += valor;
            } else {
                custosFixosCalc += valor;
            }
        });

        const custosTotaisCalc = custosFixosCalc + custosEstimadosCalc;
        const lucroRealCalc = valorPropostoNum - custosTotaisCalc;
        
        return { 
            saldoDevedor: saldoDevedorCalc, 
            custosTotais: custosTotaisCalc, 
            lucroReal: lucroRealCalc,
            custosFixos: custosFixosCalc,
            custosEstimados: custosEstimadosCalc
        };
    }, [pedido]);
  
    if (!initialPedido) {
        return null;
    }

    if (isLoadingOrcamento) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg p-8 text-center">
                    <p className="font-semibold">A carregar detalhes do pedido...</p>
                    <p className="text-sm text-gray-500 mt-2">Por favor, aguarde.</p>
                </div>
            </div>
        );
    }
  
    if (!pedido) {
        return null;
    }
    
    const isMutating = deleteMutation.isPending || updateStatusMutation.isPending || submitOrcamentoMutation.isPending || marcarPagoMutation.isPending;
    const podeAgendar = ['Aceito', 'Agendado'].includes(pedido.status);

    const StatusBanner = () => {
        if (pedido.status === 'Finalizado') return <div className="p-3 mb-6 bg-green-100 text-green-800 rounded-lg text-center">Este pedido foi finalizado.</div>;
        if (pedido.status === 'Rejeitado') return <div className="p-3 mb-6 bg-red-100 text-red-800 rounded-lg text-center">Este pedido foi rejeitado.</div>;
        return null;
    };
    
    return (
         <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                    <header className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Detalhes do Pedido #{pedido.shortId}</h2>
                        <div className="flex items-center space-x-2">
                            <button onClick={handleCopyPublicLink} disabled={isSubmitting} className="p-2 rounded-full text-gray-500 hover:bg-blue-100 hover:text-blue-600 disabled:opacity-50" title="Copiar link de acompanhamento para o cliente"><Link className="h-5 w-5" /></button>
                            <button onClick={handleDelete} disabled={isSubmitting} className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-50" title="Excluir este pedido"><Trash2 className="h-5 w-5" /></button>
                            <button onClick={onClose} disabled={isSubmitting} className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50"><X className="h-6 w-6 text-gray-600" /></button>
                        </div>
                    </header>

                    <main className="flex-grow overflow-y-auto">
                        <div className="p-6">
                            <StatusBanner />
                            <TabNav tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                                <div className="lg:col-span-2 space-y-6">
                                    {activeTab === 'Geral' && (
                                        <AbaGeral
                                            pedido={pedido}
                                            categoria={categoria}
                                            setCategoria={setCategoria}
                                            handleCategoriaBlur={handleCategoriaBlur}
                                            categories={categories}
                                            valorProposto={valorProposto}
                                            setValorProposto={setValorProposto}
                                            handleSubmitOrcamento={handleSubmitOrcamento}
                                            submitOrcamentoMutation={submitOrcamentoMutation}
                                            handleSendWhatsAppMessage={handleSendWhatsAppMessage}
                                        />
                                    )}
                                    {activeTab === 'Financeiro' && (
                                        <AbaFinanceiro
                                            pedido={pedido}
                                            custosTotais={custosTotais}
                                            lucroReal={lucroReal}
                                            custosFixos={custosFixos}
                                            custosEstimados={custosEstimados}
                                            saldoDevedor={saldoDevedor}
                                            setIsReminderModalOpen={setIsReminderModalOpen}
                                            isMutating={isMutating}
                                            handleMarcarComoPago={handleMarcarComoPago}
                                            marcarPagoMutation={marcarPagoMutation}
                                            mostrarCalculadora={mostrarCalculadora}
                                            setMostrarCalculadora={setMostrarCalculadora}
                                            horasEstimadas={horasEstimadas}
                                            setHorasEstimadas={setHorasEstimadas}
                                            custoHora={custoHora}
                                            setCustoHora={setCustoHora}
                                            margemLucro={margemLucro}
                                            setMargemLucro={setMargemLucro}
                                            custoTerceiros={custoTerceiros}
                                            setCustoTerceiros={setCustoTerceiros}
                                            handleSugerirPreco={handleSugerirPreco}
                                            precoSugerido={precoSugerido}
                                            novoValor={novoValor}
                                            setNovoValor={setNovoValor}
                                            novoMetodo={novoMetodo}
                                            setNovoMetodo={setNovoMetodo}
                                            novaObservacao={novaObservacao}
                                            setNovaObservacao={setNovaObservacao}
                                            handleAddPagamento={handleAddPagamento}
                                            addPagamentoMutation={addPagamentoMutation}
                                            handleRemovePagamento={handleRemovePagamento}
                                        />
                                    )}
                                    {activeTab === 'Operacional' && (
                                        <AbaOperacional
                                            pedido={pedido}
                                            anotacoes={anotacoes}
                                            setAnotacoes={setAnotacoes}
                                            lembreteNF={lembreteNF}
                                            setLembreteNF={setLembreteNF}
                                            handleSalvarDetalhesOperacionais={handleSalvarDetalhesOperacionais}
                                            podeAgendar={podeAgendar}
                                            isScheduling={isScheduling}
                                            formatSuggestedDate={formatSuggestedDate}
                                            handleSchedule={handleSchedule}
                                            isSubmitting={isSubmitting}
                                            isSugestaoValida={isSugestaoValida}
                                            setIsScheduling={setIsScheduling}
                                            materiaisUsados={pedido.materiaisUsados}
                                            getNumericValue={getNumericValue}
                                            handleRemoveMaterial={handleRemoveMaterial}
                                            produtosDisponiveis={produtosDisponiveis}
                                            produtoSelecionadoId={produtoSelecionadoId}
                                            setProdutoSelecionadoId={setProdutoSelecionadoId}
                                            quantidadeUsada={quantidadeUsada}
                                            setQuantidadeUsada={setQuantidadeUsada}
                                            handleAdicionarMaterial={handleAdicionarMaterial}
                                            isAddingMaterial={isAddingMaterial}
                                            custosMateriais={pedido.custosMateriais}
                                            handleRemoveCusto={handleRemoveCusto}
                                            custoDescricao={custoDescricao}
                                            setCustoDescricao={setCustoDescricao}
                                            custoValor={custoValor}
                                            setCustoValor={setCustoValor}
                                            custoTipo={custoTipo}
                                            setCustoTipo={setCustoTipo}
                                            handleAdicionarCusto={handleAdicionarCusto}
                                            ScheduleForm={ScheduleForm}
                                        />
                                    )}
                                    {activeTab === 'Plano de Execução' && (
                                        <Checklist pedido={pedido} />
                                    )}
                                    {activeTab === 'Documentos e Histórico' && (
                                        <AbaDocumentos
                                            pedido={pedido}
                                            notas={notas}
                                            setNotas={setNotas}
                                            saveStatus={saveStatus}
                                            setSaveStatus={setSaveStatus}
                                            handleSaveNotas={handleSaveNotas}
                                            handleFotoSubmit={handleFotoSubmit}
                                            apiClient={apiClient}
                                            fileInputRef={fileInputRef}
                                            handleFileChange={handleFileChange}
                                            isUploading={isUploading}
                                            handleAttachClick={handleAttachClick}
                                        />
                                    )}
                                </div>
                                <div className="space-y-6">
                                    <Timeline historico={pedido.historico} />
                                    <ResumoFinanceiro valorProposto={pedido.valorProposto} custosTotais={custosTotais} lucroReal={lucroReal} />
                                    <AcoesPrincipais
                                        pedido={pedido}
                                        podeAgendar={podeAgendar}
                                        isScheduling={isScheduling}
                                        setIsScheduling={setIsScheduling}
                                        handleSchedule={handleSchedule}
                                        isSubmitting={isSubmitting}
                                        isSugestaoValida={isSugestaoValida}
                                        formatSuggestedDate={formatSuggestedDate}
                                        handleUpdateStatus={handleUpdateStatus}
                                        isMutating={isMutating}
                                    />
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            <ConfirmModal
                isOpen={confirmation.isOpen}
                title={confirmation.title}
                message={confirmation.message}
                onConfirm={confirmation.onConfirm}
                onCancel={() => setConfirmation({ isOpen: false })}
            />
            {isReminderModalOpen && (
                <WhatsappReminderModal
                    orcamentoId={pedido._id}
                    onClose={() => setIsReminderModalOpen(false)}
                />
            )}
            {isCobrancaModalOpen && (
                <EnviarCobrancaModal
                    pedidoId={pedido._id}
                    onClose={() => setIsCobrancaModalOpen(false)}
                />
            )}
        </>
    );
}
