import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X } from 'lucide-react';
import { createCliente } from '../../api/clientesApi';
import apiClient from '../../api/apiClient'; // Import apiClient

const AddClienteModal = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        email: '',
        endereco: {
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: '',
            estado: '',
            cep: '',
        }
    });

    const createMutation = useMutation({
        mutationFn: createCliente,
        onSuccess: () => {
            toast.success('Cliente adicionado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            onClose(); // Close modal on success
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Falha ao adicionar cliente.');
        }
    });
    
    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                nome: '', telefone: '', email: '',
                endereco: { logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' }
            });
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('endereco.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({ ...prev, endereco: { ...prev.endereco, [field]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCepSearch = async () => {
        const cep = formData.endereco.cep.replace(/\D/g, '');
        if (cep.length !== 8) {
            toast.error('CEP inválido.');
            return;
        }
        try {
            const { data } = await apiClient.get(`https://viacep.com.br/ws/${cep}/json/`);
            if (data.erro) {
                toast.error('CEP não encontrado.');
            } else {
                setFormData(prev => ({
                    ...prev,
                    endereco: {
                        ...prev.endereco,
                        logradouro: data.logradouro,
                        bairro: data.bairro,
                        cidade: data.localidade,
                        estado: data.uf,
                    },
                }));
                toast.success('Endereço preenchido!');
            }
        } catch (error) {
            toast.error('Erro ao buscar CEP.');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.nome) {
            toast.error('O campo Nome é obrigatório.');
            return;
        }
        createMutation.mutate(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Adicionar Novo Cliente</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={createMutation.isPending}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <fieldset disabled={createMutation.isPending}>
                        <legend className="text-lg font-semibold text-gray-700 mb-4">Informações Pessoais</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="nome" className="block text-sm font-medium text-gray-600 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                                <Input type="text" name="nome" id="nome" value={formData.nome} onChange={handleChange} required />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                                <Input type="email" name="email" id="email" value={formData.email} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="telefone" className="block text-sm font-medium text-gray-600 mb-1">Telefone / WhatsApp</label>
                                <Input type="tel" name="telefone" id="telefone" value={formData.telefone} onChange={handleChange} />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset disabled={createMutation.isPending}>
                        <legend className="text-lg font-semibold text-gray-700 mb-4 pt-4 border-t">Endereço</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="endereco.cep" className="block text-sm font-medium text-gray-600 mb-1">CEP</label>
                                <div className="flex items-center gap-2">
                                    <Input type="text" name="endereco.cep" id="endereco.cep" value={formData.endereco.cep} onChange={handleChange} />
                                    <Button type="button" onClick={handleCepSearch} variant="outline">Buscar</Button>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="endereco.logradouro" className="block text-sm font-medium text-gray-600 mb-1">Logradouro (Rua, Av.)</label>
                                <Input type="text" name="endereco.logradouro" id="endereco.logradouro" value={formData.endereco.logradouro} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="endereco.numero" className="block text-sm font-medium text-gray-600 mb-1">Número</label>
                                <Input type="text" name="endereco.numero" id="endereco.numero" value={formData.endereco.numero} onChange={handleChange} />
                            </div>
                             <div>
                                <label htmlFor="endereco.bairro" className="block text-sm font-medium text-gray-600 mb-1">Bairro</label>
                                <Input type="text" name="endereco.bairro" id="endereco.bairro" value={formData.endereco.bairro} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="endereco.cidade" className="block text-sm font-medium text-gray-600 mb-1">Cidade</label>
                                <Input type="text" name="endereco.cidade" id="endereco.cidade" value={formData.endereco.cidade} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="endereco.estado" className="block text-sm font-medium text-gray-600 mb-1">Estado</label>
                                <Input type="text" name="endereco.estado" id="endereco.estado" value={formData.endereco.estado} onChange={handleChange} />
                            </div>
                        </div>
                    </fieldset>
                </form>
                <div className="p-6 bg-gray-50 border-t mt-auto flex justify-end space-x-3">
                    <Button variant="ghost" onClick={onClose} disabled={createMutation.isPending}>Cancelar</Button>
                    <Button onClick={handleSubmit} className="bg-[#2F5DE4] hover:bg-[#254AC7] text-white" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Salvando...' : 'Salvar Cliente'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddClienteModal;
