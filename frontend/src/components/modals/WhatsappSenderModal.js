import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getWhatsappTemplates, renderWhatsappTemplate } from '../../api/whatsappApi';
import { Button } from '../ui/Button.jsx';
import { toast } from 'react-hot-toast';

const WhatsappSenderModal = ({ orcamentoId, cliente, onClose }) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [renderedMessage, setRenderedMessage] = useState('');

    // 1. Fetch available templates
    const { data: templates, isLoading: isLoadingTemplates, error: errorTemplates } = useQuery({
        queryKey: ['whatsappTemplates'],
        queryFn: getWhatsappTemplates,
    });

    // 2. Fetch the rendered message when a template is selected
    const { isLoading: isLoadingRender, refetch: renderTemplate } = useQuery({
        queryKey: ['renderWhatsappTemplate', selectedTemplateId, orcamentoId],
        queryFn: () => renderWhatsappTemplate(selectedTemplateId, orcamentoId),
        enabled: false, // This query will only run when we manually call refetch()
        onSuccess: (data) => setRenderedMessage(data.mensagemFinal),
        onError: (err) => toast.error(`Erro ao gerar mensagem: ${err.message}`),
    });

    useEffect(() => {
        if (selectedTemplateId) {
            renderTemplate();
        }
    }, [selectedTemplateId, renderTemplate]);

    const handleSend = () => {
        if (!renderedMessage) {
            toast.error("A mensagem ainda não foi gerada.");
            return;
        }
        if (!cliente?.telefone) {
            toast.error("Número de telefone do cliente não encontrado.");
            return;
        }

        const phoneNumber = cliente.telefone.replace(/\D/g, ''); // Remove non-numeric characters
        const encodedMessage = encodeURIComponent(renderedMessage);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">Enviar Mensagem via WhatsApp</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200">
                        &times;
                    </button>
                </header>
                <main className="p-6 space-y-4">
                    <div>
                        <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-1">
                            1. Escolha o modelo da mensagem
                        </label>
                        <select
                            id="template-select"
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            disabled={isLoadingTemplates}
                            className="w-full p-2 border rounded-md bg-white"
                        >
                            <option value="" disabled>
                                {isLoadingTemplates ? 'A carregar modelos...' : 'Selecione um modelo'}
                            </option>
                            {templates?.map(template => (
                                <option key={template._id} value={template._id}>
                                    {template.titulo}
                                </option>
                            ))}
                        </select>
                        {errorTemplates && <p className="text-red-500 text-xs mt-1">{errorTemplates.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            2. Pré-visualização da Mensagem
                        </label>
                        <textarea
                            value={isLoadingRender ? 'A gerar mensagem...' : renderedMessage || ''}
                            onChange={(e) => setRenderedMessage(e.target.value)} // Allow editing
                            rows="6"
                            className="w-full p-2 border rounded-md bg-gray-50"
                        />
                    </div>
                </main>
                <footer className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSend} disabled={!renderedMessage || isLoadingRender}>
                        Enviar via WhatsApp
                    </Button>
                </footer>
            </div>
        </div>
    );
};

export default WhatsappSenderModal;
