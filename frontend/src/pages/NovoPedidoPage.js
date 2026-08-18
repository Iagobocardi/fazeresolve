import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { FaTrashAlt, FaSearch } from 'react-icons/fa';
import { fetchAddressByCep } from '../api/utilsApi';
import AdicionarEstoqueModal from '../components/modals/AdicionarEstoqueModal';
import AssistenteCustoModal from '../components/modals/AssistenteCustoModal';
import CalculadoraOrcamentoModal from '../components/modals/CalculadoraOrcamentoModal';

const fetchClients = async (searchTerm) => {
    if (!searchTerm) return [];
    const { data } = await apiClient.get(`/clientes?search=${searchTerm}`);
    return data;
};

const fetchProducts = async () => {
    const { data } = await apiClient.get('/produtos');
    return data;
};

const AddClientModal = ({ isOpen, onClose, onSave }) => {
    const [newClient, setNewClient] = useState({
        nome: '',
        telefone: '',
        email: '',
        endereco: {
            cep: '',
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: '',
            estado: '',
        }
    });
    const [isFetchingCep, setIsFetchingCep] = useState(false);
    const numeroInputRef = useRef(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('endereco.')) {
            const field = name.split('.')[1];
            setNewClient(prev => ({
                ...prev,
                endereco: { ...prev.endereco, [field]: value }
            }));
        } else {
            setNewClient({ ...newClient, [name]: value });
        }
    };

    const handleCepBlur = async (e) => {
        const cep = e.target.value;
        if (!cep || cep.replace(/\D/g, '').length !== 8) {
            return;
        }

        setIsFetchingCep(true);
        try {
            const addressData = await fetchAddressByCep(cep);
            setNewClient(prev => ({
                ...prev,
                endereco: {
                    ...prev.endereco,
                    logradouro: addressData.logradouro,
                    bairro: addressData.bairro,
                    cidade: addressData.cidade,
                    estado: addressData.estado,
                }
            }));
            toast.success('Endereço preenchido!');
            numeroInputRef.current?.focus();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsFetchingCep(false);
        }
    };

    const handleSave = () => {
        if (!newClient.nome || !newClient.telefone) {
            toast.error("Nome e telefone são obrigatórios.");
            return;
        }
        onSave(newClient);
        setNewClient({ nome: '', telefone: '', email: '', endereco: { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '' } });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
                <h2 className="text-xl font-bold">Adicionar Novo Cliente</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="modal-nome" className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                        <Input id="modal-nome" name="nome" value={newClient.nome} onChange={handleChange} />
                    </div>
                    <div>
                        <label htmlFor="modal-telefone" className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                        <Input id="modal-telefone" name="telefone" value={newClient.telefone} onChange={handleChange} />
                    </div>
                </div>
                <div>
                    <label htmlFor="modal-email" className="block text-sm font-medium text-gray-700 mb-1">Email (Opcional)</label>
                    <Input id="modal-email" name="email" type="email" value={newClient.email} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <label htmlFor="modal-cep" className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                        <Input id="modal-cep" name="endereco.cep" value={newClient.endereco.cep} onChange={handleChange} onBlur={handleCepBlur} disabled={isFetchingCep} />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="modal-logradouro" className="block text-sm font-medium text-gray-700 mb-1">Rua / Logradouro</label>
                        <Input id="modal-logradouro" name="endereco.logradouro" value={newClient.endereco.logradouro} onChange={handleChange} disabled={isFetchingCep} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="modal-numero" className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                        <Input id="modal-numero" name="endereco.numero" value={newClient.endereco.numero} onChange={handleChange} ref={numeroInputRef} />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="modal-bairro" className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                        <Input id="modal-bairro" name="endereco.bairro" value={newClient.endereco.bairro} onChange={handleChange} disabled={isFetchingCep} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label htmlFor="modal-cidade" className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                        <Input id="modal-cidade" name="endereco.cidade" value={newClient.endereco.cidade} onChange={handleChange} disabled={isFetchingCep} />
                    </div>
                    <div>
                        <label htmlFor="modal-estado" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                        <Input id="modal-estado" name="endereco.estado" value={newClient.endereco.estado} onChange={handleChange} disabled={isFetchingCep} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isFetchingCep}>
                        {isFetchingCep ? 'Aguarde...' : 'Salvar Cliente'}
                    </Button>
                </div>
            </div>
        </div>
    );
};


const NovoPedidoPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // State for the form
    const [selectedClient, setSelectedClient] = useState(null);
    
    const [clientData, setClientData] = useState({ nome: '', telefone: '', email: '', endereco: { cep: '' } });
    const [orcamentoData, setOrcamentoData] = useState({ status: 'Pendente' });
    const [items, setItems] = useState([{ id: 1, descricao: '', qtd: 1, precoUnit: '', produtoId: null }]);
    const [discount, setDiscount] = useState(0);
    const [fees, setFees] = useState(0);
    const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState(null);

    // State for new modals
    const [isStockModalOpen, setStockModalOpen] = useState(false);
    const [isAssistantModalOpen, setAssistantModalOpen] = useState(false);
    const [isCalculatorModalOpen, setCalculatorModalOpen] = useState(false);
    const [assistantItem, setAssistantItem] = useState(null);
    
    // State for client search
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [showClientResults, setShowClientResults] = useState(false);

    const { data: clientResults } = useQuery({
        queryKey: ['clients', clientSearchTerm],
        queryFn: () => fetchClients(clientSearchTerm),
        enabled: clientSearchTerm.length > 2,
    });

    const { data: products } = useQuery({
        queryKey: ['products'],
        queryFn: fetchProducts,
    });

    const createOrderMutation = useMutation({
        mutationFn: (newOrderData) => apiClient.post('/orcamentos', newOrderData),
        onSuccess: (data) => {
            const newOrderId = data.data._id;
            toast.success('Pedido criado com sucesso!');
            queryClient.refetchQueries({ queryKey: ['pedidos'], exact: true });
            queryClient.refetchQueries({ queryKey: ['produtos'], exact: true }); // To update stock
            navigate(`/pedidos?open=${newOrderId}`);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Falha ao criar o registo do pedido.');
        }
    });

    const handleClientSelect = (client) => {
        setSelectedClient(client);
        setClientData({ 
            nome: client.nome, 
            telefone: client.telefone, 
            email: client.email || '',
            endereco: client.endereco || { cep: '' }
        });
        setClientSearchTerm('');
        setShowClientResults(false);
    };

    const handleOrcamentoDataChange = (e) => {
        setOrcamentoData({ ...orcamentoData, [e.target.name]: e.target.value });
    };

    const handleItemChange = (id, field, value) => {
        let newItems = [...items];
        const itemIndex = newItems.findIndex(item => item.id === id);
        if (itemIndex === -1) return;

        const currentItem = newItems[itemIndex];
        currentItem[field] = value;

        if (field === 'descricao') {
            const selectedProduct = products?.find(p => p.nome.toLowerCase() === value.toLowerCase());
            if (selectedProduct) {
                currentItem.precoUnit = Number(selectedProduct.custoUnitario) || 0;
                currentItem.qtd = 1;
                currentItem.produtoId = selectedProduct._id;
            } else {
                currentItem.produtoId = null;
            }
        }

        if (field === 'qtd' && currentItem.produtoId) {
            const product = products?.find(p => p._id === currentItem.produtoId);
            if (product && value > product.quantidadeEmEstoque) {
                toast.error(`A quantidade excede o estoque disponível de ${product.quantidadeEmEstoque} un.`);
                currentItem.qtd = product.quantidadeEmEstoque;
            }
        }
        
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), descricao: '', qtd: 1, precoUnit: '', produtoId: null }]);
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };
    
    const handleResetClient = () => {
        setSelectedClient(null);
        setClientData({ nome: '', telefone: '', email: '', endereco: { cep: '' } });
    };

    const handleSaveNewClient = (newClient) => {
        setClientData(newClient);
        setSelectedClient(null); // It's a new client, not one from the list
        setIsNewClientModalOpen(false);
    };

    const handleAddFromStock = (stockItem) => {
        const newItem = {
            id: `stock-${stockItem.produtoId}-${Date.now()}`,
            descricao: stockItem.description,
            qtd: stockItem.qty,
            precoUnit: stockItem.price,
            produtoId: stockItem.produtoId,
        };
        setItems(prev => [...prev, newItem]);
    };

    const handleOpenAssistant = (item) => {
        if (!item.descricao?.trim()) {
            toast.error("Digite uma descrição para o item antes de usar o assistente.");
            return;
        }
        setAssistantItem(item);
        setAssistantModalOpen(true);
    };

    const handleUseAssistantPrice = (price) => {
        if (assistantItem) {
            handleItemChange(assistantItem.id, 'precoUnit', price);
        }
    };
    
    const handleApplyCalculatorPrice = (price) => {
        const valorItens = subtotal;
        const diferenca = price - valorItens;

        if (diferenca < 0) {
            setDiscount(Math.abs(diferenca));
            setFees(0);
        } else {
            setFees(diferenca);
            setDiscount(0);
        }
        toast.success('Preço sugerido aplicado como ajuste de valor do orçamento.');
        setCalculatorModalOpen(false);
    };

    const { subtotal, total } = useMemo(() => {
        const subtotalCalc = items.reduce((acc, item) => {
            const itemTotal = (item.qtd || 0) * (item.precoUnit || 0);
            return acc + itemTotal;
        }, 0);
        const totalCalc = subtotalCalc + (Number(fees) || 0) - (Number(discount) || 0);
        return { subtotal: subtotalCalc, total: totalCalc };
    }, [items, discount, fees]);

    const generateWhatsAppMessage = () => {
        const clientName = clientData.nome.split(' ')[0] || 'Cliente';
        let itemsText = items.map(item => {
            if (!item.descricao) return '';
            return `- ${item.descricao} (Qtd: ${item.qtd})`;
        }).filter(line => line).join('\n');

        const message = `Olá, ${clientName}! 👋\n\nSegue o resumo do seu pedido/orçamento:\n\n${itemsText}\n\n*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}${fees > 0 ? `\n*Valor do Orçamento (Ajuste):* +R$ ${Number(fees).toFixed(2).replace('.', ',')}` : ''}${discount > 0 ? `\n*Desconto:* -R$ ${Number(discount).toFixed(2).replace('.', ',')}` : ''}\n*Total a Pagar:* R$ ${total.toFixed(2).replace('.', ',')}\n\nQualquer dúvida, estou à disposição!`;
        setWhatsappMessage(message);
    };

    const handleOpenMsgModal = () => {
        if (!clientData.telefone) {
            toast.error("Por favor, selecione um cliente com um número de telefone antes de enviar uma mensagem.");
            return;
        }
        generateWhatsAppMessage();
        setIsMsgModalOpen(true);
    };

    const handleSendWhatsApp = () => {
        if (!clientData.telefone) {
            toast.error("Número de telefone do cliente não encontrado.");
            return;
        }

        const phoneNumber = clientData.telefone.replace(/\D/g, '');
        const finalPhoneNumber = phoneNumber.length <= 11 ? `55${phoneNumber}` : phoneNumber;
        const encodedMessage = encodeURIComponent(whatsappMessage);
        const url = `https://wa.me/${finalPhoneNumber}?text=${encodedMessage}`;
        
        window.open(url, '_blank', 'noopener,noreferrer');
        
        setIsMsgModalOpen(false);
        toast.success("A redirecionar para o WhatsApp...");
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        let finalClientData = {};
        if (selectedClient) {
            finalClientData._id = selectedClient._id;
        } else {
            if (!clientData.nome || !clientData.telefone) {
                toast.error("Por favor, selecione ou adicione um cliente.");
                return;
            }
            finalClientData = clientData;
        }

        const stockItems = items.filter(item => item.produtoId);
        const manualItems = items.filter(item => !item.produtoId);

        const finalOrcamentoData = {
            ...orcamentoData,
            descricao: items.map(item => item.descricao).filter(Boolean).join('\n'),
            valorProposto: total,
            desconto: discount,
            itens: manualItems,
            materiaisUsados: stockItems.map(item => ({
                produto: item.produtoId,
                quantidade: Number(item.qtd),
                custoNoMomento: Number(item.precoUnit)
            })),
            custosMateriais: fees > 0 ? [{ descricao: "Ajuste de Orçamento", valor: Number(fees) }] : []
        };

        createOrderMutation.mutate({
            clienteData: finalClientData,
            orcamentoData: finalOrcamentoData,
        });
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Criar Novo Pedido</h1>
                <p className="text-gray-500 mt-1">Preencha os dados abaixo para gerar um novo orçamento ou pedido de serviço.</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <main className="lg:col-span-2 space-y-6">
                        <section className="form-section p-6">
                            <h2 className="text-lg font-semibold text-gray-800 border-b pb-4 mb-4 flex items-center">
                                <i className="fas fa-user-circle text-gray-500 mr-3"></i>
                                Dados do Cliente
                            </h2>
                            <div className="flex items-start gap-4">
                                <div className="relative flex-grow">
                                    <label htmlFor="client-search" className="block text-sm font-medium text-gray-700 mb-1">Procurar Cliente</label>
                                    <Input 
                                        id="client-search"
                                        placeholder="Digite para procurar por nome ou telefone..."
                                        value={clientSearchTerm}
                                        onChange={(e) => {
                                            setClientSearchTerm(e.target.value);
                                            setShowClientResults(true);
                                            if (selectedClient || clientData.nome) handleResetClient();
                                        }}
                                        className="form-input w-full pl-10 pr-4 py-2"
                                    />
                                    <i className="fas fa-search absolute left-3 top-10 transform -translate-y-1/2 text-gray-400"></i>
                                    {showClientResults && clientResults && (
                                        <ul className="absolute z-10 w-full bg-white border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                                            {clientResults.length > 0 ? clientResults.map(client => (
                                                <li 
                                                    key={client._id} 
                                                    className="p-3 hover:bg-gray-100 cursor-pointer text-sm"
                                                    onClick={() => handleClientSelect(client)}
                                                >
                                                    <p className="font-semibold">{client.nome}</p>
                                                    <p className="text-gray-500">{client.telefone}</p>
                                                </li>
                                            )) : <li className="p-3 text-sm text-gray-500">Nenhum cliente encontrado.</li>}
                                        </ul>
                                    )}
                                </div>
                                <div className="pt-7">
                                     <button type="button" onClick={() => setIsNewClientModalOpen(true)} className="bg-blue-50 text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-100 whitespace-nowrap">
                                        <i className="fas fa-plus mr-2"></i>Novo Cliente
                                    </button>
                                </div>
                            </div>
                            {(selectedClient || clientData.nome) && (
                                <div className="mt-4 border-t pt-4">
                                    <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Nome</p>
                                            <p className="text-gray-900">{clientData.nome}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Telefone</p>
                                            <p className="text-gray-900">{clientData.telefone}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">Email</p>
                                            <p className="text-gray-900">{clientData.email || '--'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">CEP</p>
                                            <p className="text-gray-900">{clientData.endereco?.cep || '--'}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <Button variant="link" size="sm" onClick={handleResetClient}>Limpar Cliente</Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                        
                        <section className="form-section p-6">
                            <h2 className="text-lg font-semibold text-gray-800 border-b pb-4 mb-4 flex items-center">
                                <i className="fas fa-box-open text-gray-500 mr-3"></i>
                                Itens e Serviços
                            </h2>
                            <div className="space-y-3">
                                <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-semibold text-gray-600 px-2">
                                    <div className="col-span-5">Descrição</div>
                                    <div className="col-span-2 text-center">Qtd.</div>
                                    <div className="col-span-2 text-right">Preço Unit.</div>
                                    <div className="col-span-2 text-right">Total</div>
                                    <div className="col-span-1"></div>
                                </div>
                                {items.map((item) => (
                                    <div key={item.id} className="item-row grid grid-cols-12 gap-4 items-center p-2 rounded-md">
                                        <div className="col-span-12 md:col-span-5 relative">
                                            <Input 
                                                type="text" 
                                                placeholder="Selecione ou digite um serviço/produto"
                                                value={item.descricao}
                                                onFocus={() => setEditingItemId(item.id)}
                                                onChange={(e) => handleItemChange(item.id, 'descricao', e.target.value)}
                                                className="form-input w-full py-1.5 px-2 text-sm"
                                            />
                                            {editingItemId === item.id && (
                                                <div className="absolute z-20 w-full bg-white border rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                                                    {products?.map(product => (
                                                        <div 
                                                            key={product._id}
                                                            className="p-3 hover:bg-gray-100 cursor-pointer text-sm"
                                                            onClick={() => {
                                                                handleItemChange(item.id, 'descricao', product.nome);
                                                                setEditingItemId(null);
                                                            }}
                                                        >
                                                            <div className="flex justify-between w-full">
                                                                <p className="font-semibold">{product.nome}</p>
                                                                <p className="text-sm text-gray-500">
                                                                    Estoque: {product.quantidadeEmEstoque}
                                                                </p>
                                                            </div>
                                                            <p className="text-gray-500 text-sm">R$ {(product.custoUnitario || 0).toFixed(2).replace('.', ',')}</p>
                                                        </div>
                                                    ))}
                                                    <div 
                                                        className="p-3 hover:bg-gray-100 cursor-pointer text-sm text-center text-gray-500"
                                                        onClick={() => setEditingItemId(null)}
                                                    >
                                                        Fechar
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <Input 
                                                type="number" 
                                                value={item.qtd}
                                                onChange={(e) => handleItemChange(item.id, 'qtd', e.target.value)}
                                                min="1" 
                                                className="item-qty form-input w-full py-1.5 px-2 text-sm text-center"
                                            />
                                        </div>
                                        <div className="col-span-4 md:col-span-2">
                                            <div className="relative">
                                                <Input 
                                                    type="number" 
                                                    placeholder="0,00" 
                                                    min="0"
                                                    step="0.01"
                                                    value={item.precoUnit}
                                                    onChange={(e) => handleItemChange(item.id, 'precoUnit', e.target.value)}
                                                    className="item-price form-input w-full py-1.5 px-2 text-sm text-right pr-8"
                                                />
                                                <button type="button" onClick={() => handleOpenAssistant(item)} className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-blue-600" title="Estimar Custo Online">
                                                    <FaSearch />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="col-span-3 md:col-span-2">
                                            <p className="item-total font-semibold text-gray-700 text-right pr-2 text-sm">
                                                R$ {((item.qtd || 0) * (item.precoUnit || 0)).toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                        <div className="col-span-1 text-right">
                                            <button type="button" onClick={() => handleRemoveItem(item.id)} className="remove-item-btn text-gray-500 hover:text-red-600 w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center">
                                                <FaTrashAlt />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-4 mt-4">
                                <button id="add-item-btn" type="button" onClick={handleAddItem} className="bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
                                    <i className="fas fa-plus mr-2"></i>Adicionar Item Manual
                                </button>
                                <button type="button" onClick={() => setStockModalOpen(true)} className="bg-blue-50 text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-100 text-sm">
                                    Adicionar do Estoque
                                </button>
                            </div>
                        </section>
                        
                        <section className="form-section p-6">
                            <h2 className="text-lg font-semibold text-gray-800 border-b pb-4 mb-4 flex items-center">
                                <i className="fas fa-calendar-alt text-gray-500 mr-3"></i>
                                Detalhes do Pedido
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="order-date" className="block text-sm font-medium text-gray-700 mb-1">Data do Pedido</label>
                                    <Input type="date" id="order-date" name="data" defaultValue={new Date().toISOString().slice(0, 10)} onChange={handleOrcamentoDataChange} className="form-input w-full py-2 px-3" />
                                </div>
                            </div>
                        </section>
                    </main>

                    <aside>
                        <div className="sticky top-6">
                            <section className="summary-card form-section p-6">
                                <h2 className="text-lg font-semibold text-gray-800 border-b pb-4 mb-4 flex items-center">
                                    <i className="fas fa-receipt text-gray-500 mr-3"></i>
                                        Resumo Financeiro
                                </h2>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Subtotal</span>
                                        <span id="summary-subtotal" className="font-semibold text-gray-800">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="summary-fees" className="text-gray-600">Valor do Orçamento</label>
                                        <Input 
                                            type="number" 
                                            id="summary-fees" 
                                            value={fees}
                                            onChange={(e) => setFees(parseFloat(e.target.value) || 0)}
                                            className="form-input w-32 text-right py-1 px-2" 
                                            placeholder="0,00" 
                                            min="0" 
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <label htmlFor="summary-discount" className="text-gray-600">Desconto (R$)</label>
                                        <Input 
                                            type="number" 
                                            id="summary-discount" 
                                            value={discount}
                                            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                            className="form-input w-32 text-right py-1 px-2" 
                                            placeholder="0,00" 
                                            min="0"
                                        />
                                    </div>
                                    <div className="border-t pt-4 mt-2">
                                        <div className="flex justify-between items-center text-lg">
                                            <span className="font-bold text-gray-800">TOTAL</span>
                                            <span id="summary-total" className="font-extrabold text-blue-600">R$ {total.toFixed(2).replace('.', ',')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t pt-4 mt-4">
                                    <Button type="button" variant="outline" className="w-full" onClick={() => setCalculatorModalOpen(true)}>
                                        Calculadora de Preço de Venda
                                    </Button>
                                </div>
                                <div className="mt-6 space-y-3">
                                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 transition" disabled={createOrderMutation.isPending}>
                                        <i className="fas fa-check mr-2"></i>
                                        {createOrderMutation.isPending ? 'A criar...' : 'Criar Pedido'}
                                    </button>
                                    <button type="button" className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2.5 px-4 rounded-lg hover:bg-gray-50 transition">
                                        <i className="fas fa-file-invoice mr-2"></i>Gerar Orçamento (PDF)
                                    </button>
                                    <Button type="button" variant="outline" onClick={handleOpenMsgModal} className="w-full">
                                        <i className="fab fa-whatsapp mr-2 text-green-500"></i>Enviar por WhatsApp
                                    </Button>
                                </div>
                            </section>
                        </div>
                    </aside>
                </div>
            </form>
            <AddClientModal 
                isOpen={isNewClientModalOpen}
                onClose={() => setIsNewClientModalOpen(false)}
                onSave={handleSaveNewClient}
            />

            <AdicionarEstoqueModal
                isOpen={isStockModalOpen}
                onClose={() => setStockModalOpen(false)}
                onAddItem={handleAddFromStock}
            />

            <AssistenteCustoModal
                isOpen={isAssistantModalOpen}
                onClose={() => setAssistantModalOpen(false)}
                itemDescription={assistantItem?.descricao}
                onUsePrice={handleUseAssistantPrice}
            />

            <CalculadoraOrcamentoModal
                isOpen={isCalculatorModalOpen}
                onClose={() => setCalculatorModalOpen(false)}
                materiais={items}
                onApplyPrice={handleApplyCalculatorPrice}
            />

            {/* WhatsApp Message Modal */}
            {isMsgModalOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
                        <h2 className="text-xl font-bold">Revisar e Enviar Mensagem</h2>
                        <div className="py-4">
                            <label htmlFor="whatsapp-message" className="block text-sm font-medium text-gray-700 mb-2">
                                Pré-visualização da mensagem:
                            </label>
                            <Textarea
                                id="whatsapp-message"
                                value={whatsappMessage}
                                onChange={(e) => setWhatsappMessage(e.target.value)}
                                rows={12}
                                className="form-input w-full text-sm"
                                placeholder="A sua mensagem aparecerá aqui..."
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="ghost" onClick={() => setIsMsgModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSendWhatsApp}>
                                <i className="fab fa-whatsapp mr-2"></i>Enviar Mensagem
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NovoPedidoPage;
