import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getWhatsappTemplates, renderWhatsappTemplate, scheduleMessage } from '../../api/whatsappApi';
import { Button } from '../ui/Button.jsx';
import { toast } from 'react-hot-toast';

const WhatsappReminderModal = ({ orcamentoId, clienteId, onClose }) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [renderedMessage, setRenderedMessage] = useState(null);
    const [dataEnvio, setDataEnvio] = useState('');

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
        onSuccess: (data) => setRenderedMessage(data),
        onError: (err) => toast.error(`Erro ao gerar mensagem: ${err.message}`),
    });

    useEffect(() => {
        if (selectedTemplateId) {
            renderTemplate();
        }
    }, [selectedTemplateId, renderTemplate]);

    const scheduleMutation = useMutation({
        mutationFn: scheduleMessage,
        onSuccess: () => {
            toast.success('Mensagem agendada com sucesso!');
            onClose();
        },
        onError: (err) => {
            toast.error(`Erro ao agendar mensagem: ${err.response?.data?.message || err.message}`);
        }
    });

    const handleSchedule = () => {
        if (!renderedMessage) {
            toast.error("A mensagem ainda não foi gerada.");
            return;
        }
        if (!dataEnvio) {
            toast.error("Por favor, selecione uma data e hora para o envio.");
            return;
        }
        if (!clienteId) {
            toast.error("ID do cliente não encontrado. Não é possível agendar.");
            return;
        }

        scheduleMutation.mutate({
            clienteId: clienteId,
            mensagem: renderedMessage.mensagemFinal,
            dataEnvio: dataEnvio,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <header className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">Agendar Mensagem via WhatsApp</h2>
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
                            value={isLoadingRender ? 'A gerar mensagem...' : renderedMessage?.mensagemFinal || ''}
                            readOnly
                            rows="6"
                            className="w-full p-2 border rounded-md bg-gray-50"
                        />
                    </div>

                    <div>
                        <label htmlFor="data-envio" className="block text-sm font-medium text-gray-700 mb-1">
                            3. Agendar data e hora do envio
                        </label>
                        <input
                            type="datetime-local"
                            id="data-envio"
                            value={dataEnvio}
                            onChange={(e) => setDataEnvio(e.target.value)}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                </main>
                <footer className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSchedule} disabled={!renderedMessage || isLoadingRender || scheduleMutation.isPending}>
                        {scheduleMutation.isPending ? 'Agendando...' : 'Agendar Mensagem'}
                    </Button>
                </footer>
            </div>
        </div>
    );
};

export default WhatsappReminderModal;
