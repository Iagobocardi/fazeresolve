import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getWhatsappTemplates, renderPreview } from '../../api/whatsappApi';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Input } from '../ui/Input';

const SendMessageModal = ({ isOpen, onClose, pedido }) => {
    const [activeTab, setActiveTab] = useState('template');
    const [searchTerm, setSearchTerm] = useState('');
    const [previewContent, setPreviewContent] = useState('Selecione um modelo para visualizar...');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const { data: templates, isLoading: isLoadingTemplates } = useQuery({
        queryKey: ['whatsappTemplates'],
        queryFn: getWhatsappTemplates,
        enabled: isOpen, // Only fetch when the modal is open
    });

    const renderPreviewMutation = useMutation({
        mutationFn: renderPreview,
        onSuccess: (data) => {
            setPreviewContent(data.preview);
        },
        onError: () => {
            toast.error("Falha ao gerar a pré-visualização.");
        }
    });

    useEffect(() => {
        if (selectedTemplate && pedido) {
            renderPreviewMutation.mutate({
                mensagem: selectedTemplate.mensagem,
                orcamentoId: pedido._id
            });
        }
    }, [selectedTemplate, pedido, renderPreviewMutation]);

    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);
    };

    const handleSendMessage = () => {
        if (!pedido?.cliente?.telefone) {
            toast.error("Número de telefone do cliente não encontrado.");
            return;
        }
        if (!previewContent || previewContent === 'Selecione um modelo para visualizar...') {
            toast.error("Selecione um template ou escreva uma mensagem.");
            return;
        }
    
        const phone = pedido.cliente.telefone.replace(/\D/g, '');
        const message = encodeURIComponent(previewContent);
        const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
        
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    const handleGenerateAIMessage = () => {
        setIsGenerating(true);
        setPreviewContent("Gerando mensagem...");

        // Simula uma chamada de IA com um pequeno atraso
        setTimeout(() => {
            let aiResponse = '';
            const clienteNome = `*${pedido?.cliente?.nome || 'Cliente'}*`;
            const servicoDesc = `*${pedido?.descricaoServico || 'serviço'}*`;
            const pedidoId = `*#${pedido?.shortId}*`;
            const publicLink = `${window.location.origin}/status/${pedido.publicId}`;

            switch (pedido.status) {
                case 'Pendente':
                    aiResponse = `Olá ${clienteNome}, recebemos seu pedido ${pedidoId} para ${servicoDesc}. Você pode acompanhar o status em: ${publicLink}\n\nEm breve, enviaremos um orçamento detalhado. Obrigado!`;
                    break;
                case 'Aceito':
                    aiResponse = `Olá ${clienteNome}, seu orçamento para o pedido ${pedidoId} (${servicoDesc}) foi aceito! 🎉\n\nVamos agendar o melhor dia e horário para realizar o serviço. Qual sua preferência?\n\nAcompanhe aqui: ${publicLink}`;
                    break;
                case 'Agendado':
                    const dataAgendamento = pedido.dataAgendamento ? new Date(pedido.dataAgendamento).toLocaleDateString('pt-BR') : 'a data combinada';
                    const periodoAgendamento = pedido.periodo ? `no período da ${pedido.periodo}` : '';
                    aiResponse = `Olá ${clienteNome}, passando para confirmar nosso agendamento para o serviço de ${servicoDesc} (pedido ${pedidoId}) no dia ${dataAgendamento}, ${periodoAgendamento}. Até lá!\n\nLink para acompanhamento: ${publicLink}`;
                    break;
                case 'Finalizado':
                    aiResponse = `Olá ${clienteNome}, seu serviço de ${servicoDesc} (pedido ${pedidoId}) foi finalizado. Agradecemos a confiança! Se puder, nos deixe uma avaliação. 😊\n\nVeja o resumo do seu pedido aqui: ${publicLink}`;
                    break;
                default:
                    aiResponse = `Olá ${clienteNome}, gostaria de falar sobre o seu pedido ${pedidoId} referente a ${servicoDesc}. Link para detalhes: ${publicLink}`;
                    break;
            }
            
            setPreviewContent(aiResponse);
            setIsGenerating(false);
        }, 800);
    };

    const filteredTemplates = useMemo(() => {
        if (!templates) return [];
        return templates.filter(t => t.titulo.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [templates, searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-xl relative">
                
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>

                <div className="flex flex-col">
                    <h2 className="text-xl font-bold mb-4">Enviar Mensagem para {pedido?.cliente?.nome}</h2>
                    
                    <div className="flex border-b border-gray-200 mb-4">
                        <button onClick={() => setActiveTab('template')} className={`py-2 px-4 font-semibold ${activeTab === 'template' ? 'border-b-2 border-[#2F5DE4] text-[#2F5DE4]' : 'text-gray-500 hover:text-gray-700'}`}>Usar Template</button>
                        <button onClick={() => setActiveTab('ai')} className={`py-2 px-4 font-semibold ${activeTab === 'ai' ? 'border-b-2 border-[#2F5DE4] text-[#2F5DE4]' : 'text-gray-500 hover:text-gray-700'}`}>Gerar com IA</button>
                    </div>

                    {activeTab === 'template' && (
                        <div>
                            {/* Sugestões (lógica a ser implementada) */}
                            <p className="text-sm font-semibold text-gray-600 mb-2">Templates</p>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {isLoadingTemplates ? <p>Carregando...</p> : filteredTemplates.map(template => (
                                    <div key={template._id} className="border border-gray-200 p-3 rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => handleSelectTemplate(template)}>
                                        <p className="font-semibold">{template.titulo}</p>
                                        <p className="text-xs text-gray-500 truncate">{template.mensagem}</p>
                                    </div>
                                ))}
                            </div>
                            <hr className="my-4"/>
                            <Input
                                type="search"
                                placeholder="Buscar template..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div>
                            <label htmlFor="ai-prompt" className="text-sm font-semibold text-gray-600 mb-2 block">O que você gostaria de dizer?</label>
                            <Textarea id="ai-prompt" rows="3" placeholder="Ex: perguntar se ele gostou do serviço e oferecer um cupom para a próxima vez" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
                            <div className="flex justify-end mt-2">
                                <Button onClick={handleGenerateAIMessage} disabled={isGenerating}>
                                    {isGenerating ? 'Gerando...' : 'Gerar Mensagem'}
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="mt-auto pt-6 flex justify-end space-x-3">
                        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSendMessage} disabled={isGenerating} className="bg-green-500 hover:bg-green-600">
                            {'Enviar via WhatsApp'}
                        </Button>
                    </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-center mb-4">Pré-visualização da Mensagem</h3>
                     <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-xl border-4 border-gray-800 overflow-hidden">
                        <div className="h-full bg-cover" style={{backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')"}}>
                            <div className="bg-gray-100 p-3 flex items-center shadow-sm">
                                 <img src={`https://placehold.co/40x40/E2E8F0/4A5568?text=${pedido?.cliente?.nome?.charAt(0)}`} alt="Avatar" className="w-10 h-10 rounded-full"/>
                                <div className="ml-3">
                                    <p className="font-bold">{pedido?.cliente?.nome}</p>
                                    <p className="text-xs text-gray-500">online</p>
                                </div>
                            </div>
                            <div className="p-4 h-[350px] flex flex-col justify-end">
                                <div className="whatsapp-bubble self-end p-2 rounded-lg rounded-tr-none">
                                    <p className="text-sm whitespace-pre-wrap">{renderPreviewMutation.isPending ? 'Gerando...' : previewContent}</p>
                                    <div className="flex justify-end items-center text-xs text-gray-500 mt-1">
                                        <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4FC3F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SendMessageModal;
