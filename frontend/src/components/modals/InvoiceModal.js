import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { createInvoice, updateInvoice, emitInvoice } from '../../api/invoicesApi';
import { getOrcamentos, getOrcamento } from '../../api/pedidosApi';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        border: 'none',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    overlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
};

// Bind modal to your appElement for accessibility
Modal.setAppElement('#root');

const InvoiceModal = ({ isOpen, onClose, invoice }) => {
    const { usuario } = useAuth();
    const queryClient = useQueryClient();
    const [view, setView] = useState('selection');
    const [isFetchingOrder, setIsFetchingOrder] = useState(false);
    const [invoiceData, setInvoiceData] = useState({
        data_emissao: new Date().toISOString().split('T')[0], // Default to today
        tomador: {
            cnpj: '',
            razao_social: '',
            email: '',
            endereco: {
                logradouro: '',
                numero: '',
                complemento: '',
                bairro: '',
                codigo_municipio: '',
                uf: '',
                cep: '',
            },
        },
        servico: {
            aliquota: '',
            discriminacao: '',
            iss_retido: 'false',
            item_lista_servico: '',
            codigo_tributario_municipio: '',
            valor_servicos: '',
        },
    });

    useEffect(() => {
        if (invoice) {
            setView('form');
            // Deep merge to avoid errors if some fields are null
            setInvoiceData(prev => ({
                ...prev,
                ...invoice,
                tomador: {
                    ...prev.tomador,
                    ...invoice.tomador,
                    endereco: {
                        ...prev.tomador.endereco,
                        ...invoice.tomador?.endereco,
                    },
                },
                servico: {
                    ...prev.servico,
                    ...invoice.servico,
                },
            }));
        } else {
            setView('selection');
            // Reset form data for new invoice
            setInvoiceData({
                data_emissao: new Date().toISOString().split('T')[0],
                tomador: { cnpj: '', razao_social: '', email: '', endereco: { logradouro: '', numero: '', complemento: '', bairro: '', codigo_municipio: '', uf: '', cep: '' } },
                servico: { aliquota: '', discriminacao: '', iss_retido: 'false', item_lista_servico: '', codigo_tributario_municipio: '', valor_servicos: '' },
            });
        }
    }, [invoice, isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const keys = name.split('.');

        setInvoiceData(prev => {
            const newState = { ...prev };
            let current = newState;

            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }

            current[keys[keys.length - 1]] = value;
            return newState;
        });
    };

    const mutation = useMutation({
        mutationFn: (newData) => {
            return invoice ? updateInvoice(invoice.id, newData) : createInvoice(newData);
        },
        onSuccess: () => {
            toast.success(`Rascunho de nota fiscal ${invoice ? 'atualizado' : 'salvo'} com sucesso!`);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            onClose();
        },
        onError: (error) => {
            toast.error(`Erro: ${error.message}`);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(invoiceData);
    };

    const emitMutation = useMutation({
        mutationFn: () => emitInvoice(invoice.id),
        onSuccess: () => {
            toast.success('A sua nota fiscal está a ser processada!');
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            onClose();
        },
        onError: (error) => {
            toast.error(`Erro ao emitir nota: ${error.message}`);
        },
    });

    const handleEmit = () => {
        emitMutation.mutate();
    };

    const hasPermission = (permission) => {
        if (!usuario || !usuario.permissoes) return false;
        if (usuario.role === 'Dono') return true;
        return usuario.permissoes.includes(permission);
    };

    const handleSelectOrder = async (orderId) => {
        setIsFetchingOrder(true);
        try {
            const order = await getOrcamento(orderId);
            // Assuming the order object has a structure that can be mapped to the invoice
            setInvoiceData({
                ...invoiceData, // Keep data_emissao and other defaults
                tomador: {
                    cnpj: order.cliente?.documento || '',
                    razao_social: order.cliente?.nome || '',
                    email: order.cliente?.email || '',
                    endereco: {
                        logradouro: order.cliente?.endereco?.logradouro || '',
                        numero: order.cliente?.endereco?.numero || '',
                        complemento: order.cliente?.endereco?.complemento || '',
                        bairro: order.cliente?.endereco?.bairro || '',
                        codigo_municipio: order.cliente?.endereco?.codigo_municipio || '',
                        uf: order.cliente?.endereco?.estado || '',
                        cep: order.cliente?.endereco?.cep || '',
                    },
                },
                servico: {
                    ...invoiceData.servico,
                    discriminacao: order.descricao || 'Serviços prestados conforme pedido #' + order.id,
                    valor_servicos: order.valor_total || '',
                },
            });
            setView('form');
        } catch (err) {
            toast.error('Erro ao buscar detalhes do pedido.');
        } finally {
            setIsFetchingOrder(false);
        }
    };

    const renderForm = () => (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
                <label htmlFor="data_emissao">Data de Emissão</label>
                <Input name="data_emissao" type="date" value={invoiceData.data_emissao} onChange={handleInputChange} />
            </div>

            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Dados do Tomador (Cliente)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label htmlFor="tomador.razao_social">Nome / Razão Social</label>
                        <Input name="tomador.razao_social" value={invoiceData.tomador.razao_social} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="tomador.cnpj">CPF / CNPJ</label>
                        <Input name="tomador.cnpj" value={invoiceData.tomador.cnpj} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label htmlFor="tomador.email">Email</label>
                        <Input name="tomador.email" type="email" value={invoiceData.tomador.email} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label htmlFor="tomador.endereco.logradouro">Logradouro</label>
                        <Input name="tomador.endereco.logradouro" value={invoiceData.tomador.endereco.logradouro} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="tomador.endereco.numero">Número</label>
                        <Input name="tomador.endereco.numero" value={invoiceData.tomador.endereco.numero} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="tomador.endereco.complemento">Complemento</label>
                        <Input name="tomador.endereco.complemento" value={invoiceData.tomador.endereco.complemento} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="tomador.endereco.bairro">Bairro</label>
                        <Input name="tomador.endereco.bairro" value={invoiceData.tomador.endereco.bairro} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="tomador.endereco.codigo_municipio">Cód. Município</label>
                        <Input name="tomador.endereco.codigo_municipio" value={invoiceData.tomador.endereco.codigo_municipio} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="tomador.endereco.uf">UF</label>
                        <Input name="tomador.endereco.uf" value={invoiceData.tomador.endereco.uf} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="tomador.endereco.cep">CEP</label>
                        <Input name="tomador.endereco.cep" value={invoiceData.tomador.endereco.cep} onChange={handleInputChange} />
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Descrição dos Serviços</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 md:col-span-2">
                        <label htmlFor="servico.discriminacao">Discriminação do Serviço</label>
                        <Textarea name="servico.discriminacao" value={invoiceData.servico.discriminacao} onChange={handleInputChange} rows={4} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="servico.item_lista_servico">Item da Lista de Serviço</label>
                        <Input name="servico.item_lista_servico" value={invoiceData.servico.item_lista_servico} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="servico.codigo_tributario_municipio">Cód. Tributário do Município</label>
                        <Input name="servico.codigo_tributario_municipio" value={invoiceData.servico.codigo_tributario_municipio} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="servico.aliquota">Alíquota de ISS (%)</label>
                        <Input name="servico.aliquota" type="number" value={invoiceData.servico.aliquota} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="servico.valor_servicos">Valor do Serviço (R$)</label>
                        <Input name="servico.valor_servicos" type="number" value={invoiceData.servico.valor_servicos} onChange={handleInputChange} />
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
                <div>
                    {invoice && invoice.status === 'Rascunho' && hasPermission('emitir_nota_fiscal') && (
                        <Button
                            type="button"
                            variant="solid"
                            onClick={handleEmit}
                            disabled={emitMutation.isPending || mutation.isPending}
                        >
                            {emitMutation.isPending ? 'Emitindo...' : 'Emitir Nota Fiscal'}
                        </Button>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={mutation.isPending || emitMutation.isPending}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={mutation.isPending || emitMutation.isPending}>
                        {mutation.isPending ? 'Salvando...' : 'Salvar Rascunho'}
                    </Button>
                </div>
            </div>
        </form>
    );

    const renderContent = () => {
        if (isFetchingOrder) {
            return <div className="text-center p-8"><p>Buscando dados do pedido...</p></div>;
        }

        if (view === 'form') {
            return renderForm();
        }

        if (view === 'orders') {
            return <OrderSelection onSelectOrder={handleSelectOrder} />;
        }

        // Default to 'selection' view
        return (
            <div className="text-center">
                <h3 className="text-lg font-medium mb-4">Como você quer começar?</h3>
                <div className="flex justify-center gap-4">
                    <Button onClick={() => setView('form')}>
                        Começar do Zero
                    </Button>
                    <Button variant="outline" onClick={() => setView('orders')}>
                        Escolher com Base nos Pedidos
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            style={customStyles}
            contentLabel="Modal de Nota Fiscal"
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                    {invoice ? 'Editar Nota Fiscal' : 'Criar Nova Nota Fiscal'}
                </h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            {renderContent()}
        </Modal>
    );
};

const OrderSelection = ({ onSelectOrder }) => {
    const { data: orders, isLoading, error } = useQuery({
        queryKey: ['orcamentos', 'agendado'],
        queryFn: () => getOrcamentos('agendado'),
        initialData: [],
    });

    if (isLoading) return <p className="text-center text-muted-foreground">Carregando pedidos...</p>;
    if (error) return <p className="text-center text-red-500">Erro ao carregar pedidos: {error.message}</p>;

    return (
        <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Selecione um Pedido Agendado</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                {orders.length > 0 ? (
                    orders.map(order => (
                        <button
                            key={order.id}
                            onClick={() => onSelectOrder(order.id)}
                            className="w-full text-left p-2 rounded-md hover:bg-gray-100"
                        >
                            <p className="font-semibold">{order.cliente.nome}</p>
                            <p className="text-sm text-muted-foreground">
                                Pedido #{order.id} - Agendado para {new Date(order.data_agendamento).toLocaleDateString()}
                            </p>
                        </button>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground p-4">Nenhum pedido agendado encontrado.</p>
                )}
            </div>
        </div>
    );
};

export default InvoiceModal;
