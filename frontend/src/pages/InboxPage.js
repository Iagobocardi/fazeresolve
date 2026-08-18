import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext.jsx';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Send, AlertTriangle, MessageSquare } from 'lucide-react';

// --- Sub-Components for Readability ---

const ConversationList = ({ conversas, selectedConversaId, onSelectConversa }) => {
    return (
        <div className="border-r border-border h-full flex flex-col">
            <div className="p-4 border-b border-border">
                <h2 className="text-xl font-bold">Caixa de Entrada</h2>
            </div>
            <div className="overflow-y-auto flex-grow">
                <ul className="space-y-1 p-2">
                    {conversas.map((conversa) => {
                        const lastMessage = conversa.mensagens[conversa.mensagens.length - 1];
                        return (
                            <li
                                key={conversa._id}
                                onClick={() => onSelectConversa(conversa._id)}
                                className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedConversaId === conversa._id ? 'bg-accent' : 'hover:bg-accent/50'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-sm">{conversa.cliente.nome}</span>
                                    {lastMessage && (
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(lastMessage.data), 'HH:mm')}
                                        </span>
                                    )}
                                </div>
                                {lastMessage && (
                                    <p className="text-xs text-muted-foreground truncate">
                                        {lastMessage.texto}
                                    </p>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </div>
        </div>
    );
};

const MessageView = ({ conversaId }) => {
    const queryClient = useQueryClient();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const { data: conversa, isLoading, error, isSuccess } = useQuery({
        queryKey: ['conversa', conversaId],
        queryFn: async () => {
            const { data } = await apiClient.get(`/conversas/${conversaId}`);
            return data;
        },
        enabled: !!conversaId,
    });

    const sendMessageMutation = useMutation({
        mutationFn: (messageData) => apiClient.post('/conversas/enviar', messageData),
        onSuccess: () => {
            // Invalidate and refetch the conversation to show the new message
            queryClient.invalidateQueries({ queryKey: ['conversa', conversaId] });
            // Also invalidate the main conversation list to update the last message snippet
            queryClient.invalidateQueries({ queryKey: ['conversas'] });
        },
    });

    useEffect(() => {
        // Scroll to the bottom when new messages arrive
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversa]);


    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMessageMutation.mutate({
            conversaId: conversaId,
            texto: newMessage,
        });
        setNewMessage('');
    };

    if (!conversaId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <MessageSquare className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Selecione uma conversa</h3>
                <p className="text-muted-foreground">Escolha uma conversa da lista para ver as mensagens.</p>
            </div>
        );
    }

    if (isLoading) return <div className="flex items-center justify-center h-full">A carregar conversa...</div>;
    if (error) return <div className="flex flex-col items-center justify-center h-full text-destructive p-4 text-center"><AlertTriangle className="w-12 h-12 mb-4" /><p>Erro ao carregar a conversa.</p><p className="text-xs">{error.message}</p></div>;

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-4 border-b border-border">
                <h3 className="font-bold">{conversa.cliente.nome}</h3>
                <p className="text-sm text-muted-foreground">{conversa.cliente.telefone}</p>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {isSuccess && conversa.mensagens.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 ${msg.remetente === 'Prestador' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md p-3 rounded-lg ${msg.remetente === 'Prestador' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>
                            <p className="text-sm">{msg.texto}</p>
                            <p className="text-xs text-right mt-1 opacity-70">
                                {format(new Date(msg.data), 'HH:mm')}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-border">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite a sua mensagem..."
                        disabled={sendMessageMutation.isPending}
                    />
                    <Button type="submit" disabled={sendMessageMutation.isPending}>
                        <Send className="w-4 h-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
};


// --- Main Page Component ---

const InboxPage = () => {
    const [selectedConversaId, setSelectedConversaId] = useState(null);
    const { usuario } = useAuth();

    const { data: conversas, isLoading, error } = useQuery({
        queryKey: ['conversas'],
        queryFn: async () => {
            const { data } = await apiClient.get('/conversas');
            // Sort by last message date
            return data.sort((a, b) => new Date(b.mensagens[b.mensagens.length - 1]?.data) - new Date(a.mensagens[a.mensagens.length - 1]?.data));
        },
        enabled: !!usuario,
    });

    if (isLoading) return <div className="flex items-center justify-center h-full">A carregar caixa de entrada...</div>;
    if (error) return <div className="flex items-center justify-center h-full text-destructive">Erro ao carregar conversas: {error.message}</div>;

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-card border border-border rounded-lg overflow-hidden">
            <div className="w-1/3 min-w-[280px] max-w-[350px]">
                <ConversationList
                    conversas={conversas || []}
                    selectedConversaId={selectedConversaId}
                    onSelectConversa={setSelectedConversaId}
                />
            </div>
            <div className="flex-1">
                <MessageView conversaId={selectedConversaId} />
            </div>
        </div>
    );
};

export default InboxPage;
