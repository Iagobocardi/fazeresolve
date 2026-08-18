import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from '../../api/apiClient';
import { Button } from '../ui/Button.jsx';

const EnviarCobrancaModal = ({ pedidoId, onClose }) => {
    const queryClient = useQueryClient();
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [desconto, setDesconto] = useState(0);

    // 1. Fetch available templates
    const { data: templates, isLoading: isLoadingTemplates } = useQuery({
        queryKey: ['whatsappTemplates'],
        queryFn: () => apiClient.get('/whatsapp/templates').then(res => res.data),
    });

    // 2. Setup mutation for sending the invoice
    const sendInvoiceMutation = useMutation({
        mutationFn: (invoiceData) => apiClient.post(`/orcamentos/${pedidoId}/enviar-cobranca`, invoiceData),
        onSuccess: () => {
            toast.success("Cobrança enviada com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['pedidos'] });
            onClose();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Falha ao enviar cobrança.");
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedTemplateId) {
            toast.error("Por favor, selecione um template.");
            return;
        }
        sendInvoiceMutation.mutate({
            templateId: selectedTemplateId,
            desconto: Number(desconto) || 0,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <form onSubmit={handleSubmit}>
                    <header className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-xl font-bold">Enviar Cobrança via WhatsApp</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">&times;</button>
                    </header>
                    <main className="p-6 space-y-4">
                        <div>
                            <label htmlFor="templateId" className="block text-sm font-medium text-gray-700 mb-1">
                                Escolher Template de Mensagem
                            </label>
                            <select
                                id="templateId"
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                disabled={isLoadingTemplates}
                                className="w-full p-2 border rounded-md bg-white"
                                required
                            >
                                <option value="" disabled>
                                    {isLoadingTemplates ? 'A carregar...' : 'Selecione um template'}
                                </option>
                                {templates?.filter(t => t.categoria === 'Cobrança').map(template => (
                                    <option key={template._id} value={template._id}>
                                        {template.titulo}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="desconto" className="block text-sm font-medium text-gray-700 mb-1">
                                Desconto (R$)
                            </label>
                            <input
                                id="desconto"
                                type="number"
                                step="0.01"
                                value={desconto}
                                onChange={(e) => setDesconto(e.target.value)}
                                className="w-full p-2 border rounded-md"
                                placeholder="0.00"
                            />
                        </div>
                    </main>
                    <footer className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={sendInvoiceMutation.isPending}>
                            {sendInvoiceMutation.isPending ? 'A enviar...' : 'Enviar Cobrança'}
                        </Button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default EnviarCobrancaModal;
