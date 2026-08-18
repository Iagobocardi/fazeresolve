import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getTemplateVariables, saveTemplate } from '../api/whatsappApi';
import apiClient from '../api/apiClient';

const mockData = {
    "{cliente.nome}": "Maria Silva",
    "{orcamento.descricao}": "pintura completa do para-choque",
    "{orcamento.valorProposta}": "R$ 1.250,00",
    "{orcamento.dataValidade}": "25/09/2025",
    "{agendamento.dataHora}": "20/09/2025 às 14:00",
    "{linkPagamento}": "https://fazresolve.com/pay/12345"
};

const aiTemplates = {
    'budget_reminder': `Olá {cliente.nome}, tudo bem?\n\nPassando para lembrar sobre sua proposta de {orcamento.descricao}, no valor de {orcamento.valorProposta}, que é válida até {orcamento.dataValidade}.\n\nSe tiver qualquer dúvida, é só chamar! 😉`,
    'service_done': `Olá {cliente.nome}! ✨\n\nBoas notícias! Seu serviço de {orcamento.descricao} foi concluído com sucesso.\n\nJá pode passar para retirar. Muito obrigado pela confiança!`,
    'schedule_confirmation': `Olá {cliente.nome}, tudo certo?\n\nEste é um lembrete do seu agendamento para {orcamento.descricao} no dia {agendamento.dataHora}.\n\nPor favor, confirme sua presença respondendo esta mensagem. Até logo!`
};

const TemplateEditorPage = () => {
    const { templateId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('Orçamento');

    // Fetch template variables
    const { data: variables, isLoading: isLoadingVariables } = useQuery({
        queryKey: ['templateVariables'],
        queryFn: getTemplateVariables
    });

    // Fetch existing template if in edit mode
    const { data: existingTemplate, isLoading: isLoadingTemplate } = useQuery({
        queryKey: ['template', templateId],
        queryFn: () => apiClient.get(`/whatsapp/templates/${templateId}`).then(res => res.data),
        enabled: !!templateId, // Only run if templateId exists
    });

    useEffect(() => {
        if (existingTemplate) {
            setTitle(existingTemplate.titulo);
            setMessage(existingTemplate.mensagem);
            setCategory(existingTemplate.categoria);
        }
    }, [existingTemplate]);

    const saveTemplateMutation = useMutation({
        mutationFn: (templateData) => {
            if (templateId) {
                return apiClient.put(`/whatsapp/templates/${templateId}`, templateData);
            }
            return saveTemplate(templateData);
        },
        onSuccess: () => {
            toast.success(`Template ${templateId ? 'atualizado' : 'salvo'} com sucesso!`);
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            navigate('/configuracoes/templates');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || `Falha ao ${templateId ? 'atualizar' : 'salvar'} o template.`);
        }
    });

    const handleSave = () => {
        if (!title || !message) {
            toast.error("Título e mensagem são obrigatórios.");
            return;
        }
        saveTemplateMutation.mutate({ titulo: title, mensagem: message, categoria: category });
    };

    // --- Logic from user's HTML ---
    const editorRef = React.useRef(null);
    const previewContentRef = React.useRef(null);

    const updatePreview = useCallback(() => {
        if (!editorRef.current || !previewContentRef.current) return;
        let currentMessage = editorRef.current.value;
        for (const key in mockData) {
            currentMessage = currentMessage.replace(new RegExp(key.replace(/([{}])/g, '\\$1'), 'g'), `*${mockData[key]}*`);
        }
        previewContentRef.current.innerHTML = currentMessage;
    }, []);

    const addVariable = (variable) => {
        if (!editorRef.current) return;
        const editor = editorRef.current;
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        const newText = text.substring(0, start) + variable + text.substring(end);
        setMessage(newText);
        editor.focus();
        // We need to wait for the state to update before setting the selection
        setTimeout(() => {
            editor.selectionEnd = start + variable.length;
            updatePreview();
        }, 0);
    };

    const generateAIMessage = (templateKey) => {
        if (aiTemplates[templateKey]) {
            setMessage(aiTemplates[templateKey]);
        }
    };
    
    useEffect(() => {
        updatePreview();
    }, [message, updatePreview]);

    if (isLoadingTemplate) return <p>Carregando template...</p>;

    return (
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold">{templateId ? 'Editar Template' : 'Criar Novo Template'}</h1>
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/configuracoes/templates')} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-sm py-2 px-4 rounded-lg">Cancelar</button>
                    <button onClick={handleSave} disabled={saveTemplateMutation.isPending} className="bg-[#2F5DE4] hover:bg-[#254AC7] text-white font-semibold text-sm py-2 px-4 rounded-lg">
                        {saveTemplateMutation.isPending ? 'Salvando...' : 'Salvar Template'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="card p-6">
                        <label htmlFor="template-title" className="block text-sm font-medium text-gray-600 mb-1">Título do Template</label>
                        <input type="text" id="template-title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#2F5DE4] focus:border-[#2F5DE4]" />
                    </div>

                    <div className="card p-6">
                         <label htmlFor="template-category" className="block text-sm font-medium text-gray-600 mb-1">Categoria</label>
                         <select id="template-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#2F5DE4] focus:border-[#2F5DE4]">
                            <option>Orçamento</option>
                            <option>Cobrança</option>
                            <option>Pós-venda</option>
                            <option>Outro</option>
                         </select>
                    </div>

                    <div className="card p-6">
                        <h2 className="font-semibold text-lg flex items-center">
                            <span className="text-xl mr-2">✨</span>
                            Gerar mensagem com IA
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Descreva o que você precisa ou use uma sugestão rápida.</p>
                        <div className="mt-4">
                             <input type="text" id="ia-prompt" placeholder="Ex: mensagem de agradecimento com pedido de avaliação" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-[#2F5DE4] focus:border-[#2F5DE4]" />
                             <div className="flex flex-wrap gap-2 mt-3 text-sm">
                                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded-full" onClick={() => generateAIMessage('budget_reminder')}>Lembrete de Orçamento</button>
                                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded-full" onClick={() => generateAIMessage('service_done')}>Aviso de Conclusão</button>
                                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded-full" onClick={() => generateAIMessage('schedule_confirmation')}>Confirmar Agendamento</button>
                             </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h2 className="font-semibold text-lg">Mensagem</h2>
                        <textarea id="message-editor" ref={editorRef} rows="8" className="w-full mt-4 border-gray-300 rounded-md shadow-sm focus:ring-[#2F5DE4] focus:border-[#2F5DE4]" value={message} onChange={(e) => setMessage(e.target.value)}></textarea>
                    </div>

                    <div className="card p-6">
                         <h2 className="font-semibold text-lg">Variáveis Disponíveis</h2>
                         <p className="text-sm text-gray-500 mt-1">Clique para adicionar na mensagem.</p>
                         <div className="flex flex-wrap gap-2 mt-4 text-sm font-medium">
                            {isLoadingVariables ? <p>Carregando variáveis...</p> :
                                variables?.map(variable => (
                                    <span key={variable.key} className="variable-pill bg-blue-100 text-blue-800 py-1 px-3 rounded-full" onClick={() => addVariable(variable.key)}>
                                        {variable.description}
                                    </span>
                                ))
                            }
                         </div>
                    </div>
                </div>

                <div>
                    <div className="sticky top-8">
                        <h2 className="font-semibold text-lg mb-2">Pré-Visualização em Tempo Real</h2>
                        <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-xl border-4 border-gray-800 overflow-hidden">
                            <div className="h-full bg-cover" style={{backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')"}}>
                                <div className="bg-gray-100 p-3 flex items-center shadow-sm">
                                    <img src="https://placehold.co/40x40/A9BFFF/2F5DE4?text=MS" alt="Avatar" className="w-10 h-10 rounded-full mx-3" />
                                    <div>
                                        <p className="font-bold">Maria Silva</p>
                                        <p className="text-xs text-gray-500">online</p>
                                    </div>
                                </div>
                                <div className="p-4 h-[500px] flex flex-col justify-end">
                                    <div id="preview-bubble" className="whatsapp-bubble self-end p-2 rounded-lg rounded-tr-none">
                                        <p id="preview-content" ref={previewContentRef} className="text-sm whitespace-pre-wrap"></p>
                                        <div className="flex justify-end items-center text-xs text-gray-500 mt-1">
                                            <span>13:28</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default TemplateEditorPage;
