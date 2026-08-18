import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.jsx";
import { Button } from '../components/ui/Button.jsx';
import AddMemberModal from '../components/modals/AddMemberModal.js';
import PermissionsModal from '../components/modals/PermissionsModal.js';
import { updateMemberPermissions } from '../api/permissoesApi';
import { removeMember } from '../api/membrosApi.js';
import apiClient from '../api/apiClient.js';

const fetchAccountDetails = async () => {
    const { data } = await apiClient.get('/provider/account-details');
    return data;
};

const MembrosPage = () => {
    const { usuario } = useAuth();
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);

    const { data: accountDetails, isLoading, isError, error } = useQuery({
        queryKey: ['accountDetails'],
        queryFn: fetchAccountDetails,
    });

    const hasPermission = (permission) => {
        if (!usuario || !usuario.permissoes) return false;
        if (usuario.role === 'Dono') return true;
        return usuario.permissoes.includes(permission);
    };

    const { mutate: updatePermissions } = useMutation({
        mutationFn: updateMemberPermissions,
        onSuccess: () => {
            toast.success('Permissões atualizadas com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['accountDetails'] });
            setIsPermissionsModalOpen(false);
        },
        onError: (error) => {
            toast.error(`Falha ao atualizar permissões: ${error.message}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: removeMember,
        onSuccess: () => {
            toast.success("Membro removido com sucesso.");
            queryClient.invalidateQueries({ queryKey: ['accountDetails'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Falha ao remover membro.");
        }
    });

    const handleOpenPermissionsModal = (member) => {
        setSelectedMember(member);
        setIsPermissionsModalOpen(true);
    };

    const handleSavePermissions = (newPermissions) => {
        updatePermissions({ memberId: selectedMember._id, permissoes: newPermissions });
    };

    const handleDelete = (memberId) => {
        if (window.confirm("Tem certeza que deseja remover este membro? Esta ação não pode ser desfeita.")) {
            deleteMutation.mutate(memberId);
        }
    };

    const handleMemberAdded = () => {
        toast.success("Novo membro adicionado, atualizando a lista...");
        queryClient.invalidateQueries({ queryKey: ['accountDetails'] });
    };

    if (isLoading) {
        return <div>Carregando...</div>;
    }

    if (isError) {
        return <div>Erro ao carregar os dados: {error.message}</div>;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Equipe e Membros</h1>
                    {hasPermission('criar_membro') && (
                        <Button onClick={() => setIsAddModalOpen(true)}>Criar Novo Membro</Button>
                    )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Gerenciar Membros da Equipe</CardTitle>
                        <p className="text-sm text-muted-foreground pt-2">
                            Adicione, remova ou edite as permissões dos membros da sua equipe.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Ações</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {accountDetails?.membros.map((membro) => (
                                        <tr key={membro._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{membro.nome}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{membro.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{membro.role}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                {hasPermission('editar_permissoes_membro') && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleOpenPermissionsModal(membro)}>
                                                        Permissões
                                                    </Button>
                                                )}
                                                {hasPermission('deletar_membro') && membro.role !== 'Dono' && (
                                                     <Button variant="destructive" size="sm" onClick={() => handleDelete(membro._id)} disabled={deleteMutation.isPending}>
                                                        Excluir
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onMemberAdded={handleMemberAdded}
            />
            {selectedMember && (
                <PermissionsModal
                    isOpen={isPermissionsModalOpen}
                    onClose={() => setIsPermissionsModalOpen(false)}
                    member={selectedMember}
                    onSave={handleSavePermissions}
                />
            )}
        </>
    );
};

export default MembrosPage;
