import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AddFornecedorModal = ({ isOpen, onClose, onSave, isSaving, supplier }) => {
    const [formData, setFormData] = useState({
        nomeFantasia: '',
        razaoSocial: '',
        cnpj: '',
        categoria: '',
        observacoes: '',
        contato: {
            nome: '',
            telefone: '',
            email: ''
        }
    });

    const isEditMode = Boolean(supplier);

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setFormData({
                    nomeFantasia: supplier.nomeFantasia || '',
                    razaoSocial: supplier.razaoSocial || '',
                    cnpj: supplier.cnpj || '',
                    categoria: supplier.categoria || '',
                    observacoes: supplier.observacoes || '',
                    contato: {
                        nome: supplier.contato?.nome || '',
                        telefone: supplier.contato?.telefone || '',
                        email: supplier.contato?.email || ''
                    }
                });
            } else {
                // Reset form for new entry
                setFormData({
                    nomeFantasia: '',
                    razaoSocial: '',
                    cnpj: '',
                    categoria: '',
                    observacoes: '',
                    contato: { nome: '', telefone: '', email: '' }
                });
            }
        }
    }, [isOpen, supplier, isEditMode]);


    const handleChange = (e) => {
        const { id, value } = e.target;
        if (id.startsWith('contato')) {
            const field = id.split('.')[1];
            setFormData(prev => ({ ...prev, contato: { ...prev.contato, [field]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.nomeFantasia) {
            toast.error('O Nome Fantasia é obrigatório.');
            return;
        }
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">{isEditMode ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor'}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} disabled={isSaving}>
                        <X className="h-6 w-6" />
                    </Button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
                    <fieldset disabled={isSaving}>
                        <legend className="text-lg font-semibold text-gray-700 mb-4">Informações da Empresa</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="cnpj" className="block text-sm font-medium text-gray-600 mb-1">CNPJ</label>
                                <Input type="text" id="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="00.000.000/0001-00" />
                            </div>
                            <div>
                                <label htmlFor="nomeFantasia" className="block text-sm font-medium text-gray-600 mb-1">Nome Fantasia <span className="text-red-500">*</span></label>
                                <Input type="text" id="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} required />
                            </div>
                            <div>
                                <label htmlFor="razaoSocial" className="block text-sm font-medium text-gray-600 mb-1">Razão Social</label>
                                <Input type="text" id="razaoSocial" value={formData.razaoSocial} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="categoria" className="block text-sm font-medium text-gray-600 mb-1">Categoria</label>
                                <select id="categoria" value={formData.categoria} onChange={handleChange} className="mt-1 w-full border-gray-300 rounded-md shadow-sm focus:ring-[#2F5DE4] focus:border-[#2F5DE4] p-2 bg-white">
                                    <option value="">Selecione uma categoria</option>
                                    <option>Tecidos</option>
                                    <option>Tintas Automotivas</option>
                                    <option>Ferragens</option>
                                    <option>Peças</option>
                                    <option>Outros</option>
                                </select>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset disabled={isSaving}>
                        <legend className="text-lg font-semibold text-gray-700 mb-4 pt-4 border-t">Contato Principal</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="contato.nome" className="block text-sm font-medium text-gray-600 mb-1">Nome do Contato</label>
                                <Input type="text" id="contato.nome" value={formData.contato.nome} onChange={handleChange} />
                            </div>
                            <div>
                                <label htmlFor="contato.telefone" className="block text-sm font-medium text-gray-600 mb-1">Telefone / WhatsApp</label>
                                <Input type="tel" id="contato.telefone" value={formData.contato.telefone} onChange={handleChange} placeholder="(00) 90000-0000" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="contato.email" className="block text-sm font-medium text-gray-600 mb-1">E-mail</label>
                                <Input type="email" id="contato.email" value={formData.contato.email} onChange={handleChange} />
                            </div>
                        </div>
                    </fieldset>
                    
                    <fieldset disabled={isSaving}>
                        <legend className="text-lg font-semibold text-gray-700 mb-4 pt-4 border-t">Observações</legend>
                        <div>
                            <Textarea id="observacoes" value={formData.observacoes} onChange={handleChange} rows="3" placeholder="Ex: Condições de pagamento, dias de entrega, etc." />
                        </div>
                    </fieldset>
                </form>
                <div className="p-6 bg-gray-50 border-t mt-auto flex justify-end space-x-3">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button onClick={handleSubmit} className="bg-[#2F5DE4] hover:bg-[#254AC7] text-white" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Salvar Fornecedor')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddFornecedorModal;
