import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import apiClient from '../api/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Button } from '../components/ui/Button.jsx';

const TemplatesWhatsappPage = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: templates, isLoading, error } = useQuery({
        queryKey: ['templates'],
        queryFn: () => apiClient.get('/whatsapp/templates').then(res => res.data)
    });

    const deleteMutation = useMutation({
        mutationFn: (templateId) => apiClient.delete(`/whatsapp/templates/${templateId}`),
        onSuccess: () => {
            toast.success("Template apagado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['templates'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Falha ao apagar o template.");
        }
    });

    const handleDelete = (templateId) => {
        if (window.confirm("Tem a certeza que deseja apagar este template?")) {
            deleteMutation.mutate(templateId);
        }
    };
    
    const handleCreateNew = () => {
        navigate('/configuracoes/templates/new');
    };

    const handleEdit = (templateId) => {
        navigate(`/configuracoes/templates/edit/${templateId}`);
    };

    if (isLoading) return <p>Carregando templates...</p>;
    if (error) return <p className="text-destructive">Erro ao carregar templates: {error.message}</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Templates</h1>
                    <p className="text-muted-foreground">Crie e gerencie seus templates de mensagens para o WhatsApp.</p>
                </div>
                <Button onClick={handleCreateNew}>Criar Novo Template</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Templates Salvos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Título</th>
                                    <th className="px-4 py-2 text-left font-semibold">Categoria</th>
                                    <th className="px-4 py-2 text-left font-semibold">Mensagem</th>
                                    <th className="px-4 py-2 text-center font-semibold">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates && templates.map(template => (
                                    <tr key={template._id} className="border-t">
                                        <td className="px-4 py-2 font-medium">{template.titulo}</td>
                                        <td className="px-4 py-2">{template.categoria}</td>
                                        <td className="px-4 py-2 text-muted-foreground truncate max-w-xs">{template.mensagem}</td>
                                        <td className="px-4 py-2 text-center">
                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(template._id)}>Editar</Button>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/80" onClick={() => handleDelete(template._id)} disabled={deleteMutation.isPending}>Apagar</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {templates?.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum template criado ainda.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TemplatesWhatsappPage;
