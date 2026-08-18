import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/Input';
import { Plus, Users, DollarSign, Star, Search, AlertCircle } from 'lucide-react';
import AddFornecedorModal from '../components/modals/AddFornecedorModal';
import { fetchFornecedores, createFornecedor, updateFornecedor, deleteFornecedor } from '../api/fornecedoresApi';
import { Skeleton } from '../components/ui/Skeleton';
import { Pencil, Trash2 } from 'lucide-react';


const categoryColors = {
    'Tecidos': 'bg-blue-100 text-blue-800',
    'Tintas Automotivas': 'bg-red-100 text-red-800',
    'Ferragens': 'bg-green-100 text-green-800',
    'Peças': 'bg-orange-100 text-orange-800',
    'Outros': 'bg-gray-100 text-gray-800',
    'default': 'bg-gray-100 text-gray-800',
};

const FornecedoresPage = () => {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value || 0);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null); // For editing
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const queryClient = useQueryClient();

    const { data: suppliers = [], isLoading, isError, error } = useQuery({
        queryKey: ['fornecedores', { search: searchTerm, category: categoryFilter }],
        queryFn: () => fetchFornecedores({ search: searchTerm, category: categoryFilter }),
        placeholderData: (prev) => prev,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const createMutation = useMutation({
        mutationFn: createFornecedor,
        onSuccess: () => {
            toast.success('Fornecedor adicionado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
            handleCloseModal();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Falha ao adicionar fornecedor.');
        }
    });

    const updateMutation = useMutation({
        mutationFn: updateFornecedor,
        onSuccess: () => {
            toast.success('Fornecedor atualizado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
            handleCloseModal();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Falha ao atualizar fornecedor.');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteFornecedor,
        onSuccess: () => {
            toast.success('Fornecedor desativado com sucesso.');
            queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Falha ao desativar fornecedor.');
        }
    });

    const handleOpenModal = (supplier = null) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedSupplier(null);
        setIsModalOpen(false);
    };

    const handleSaveSupplier = (formData) => {
        if (selectedSupplier) {
            updateMutation.mutate({ id: selectedSupplier._id, ...formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDeleteSupplier = (id) => {
        if (window.confirm('Tem certeza que deseja desativar este fornecedor?')) {
            deleteMutation.mutate(id);
        }
    };

    const uniqueCategories = useMemo(() => {
        if (!suppliers) return [];
        const categories = suppliers.map(s => s.categoria).filter(Boolean);
        return [...new Set(categories)];
    }, [suppliers]);

    const kpiData = useMemo(() => [
        { title: 'Fornecedores Ativos', value: suppliers?.length || 0, icon: Users, color: 'blue' },
        // Placeholder values for others until API provides this data
        { title: 'Gasto Total no Mês', value: 'R$ 0,00', icon: DollarSign, color: 'green' },
        { title: 'Principal Fornecedor', value: 'N/A', icon: Star, color: 'purple' }
    ], [suppliers]);

    return (
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
            <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Fornecedores</h1>
                    <p className="text-gray-500 mt-1">Gerencie seus parceiros e histórico de compras.</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="bg-[#2F5DE4] hover:bg-[#254AC7] text-white font-semibold">
                    <Plus className="mr-2 h-5 w-5" />
                    Adicionar Fornecedor
                </Button>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {kpiData.map((kpi, index) => (
                    <Card key={index} className="p-5 flex items-center">
                        <div className={`bg-${kpi.color}-100 text-${kpi.color}-600 p-3 rounded-lg mr-4`}>
                            <kpi.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">{kpi.title}</p>
                            <p className={`text-xl font-bold ${kpi.title === 'Principal Fornecedor' ? 'lg:text-lg xl:text-xl' : 'text-2xl'}`}>{kpi.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Tabela de Fornecedores */}
            <Card className="overflow-x-auto">
                <div className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="relative w-full md:w-1/3">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <Input type="search" placeholder="Buscar por nome, razão ou CNPJ..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <select className="w-full md:w-auto border-gray-300 rounded-lg shadow-sm focus:ring-[#2F5DE4] focus:border-[#2F5DE4]" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="">Todas as Categorias</option>
                            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                </div>
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Fornecedor</th>
                            <th scope="col" className="px-6 py-3">Contato</th>
                            <th scope="col" className="px-6 py-3">Categoria</th>
                            <th scope="col" className="px-6 py-3 hidden lg:table-cell">Valor Gasto</th>
                            <th scope="col" className="px-6 py-3 hidden md:table-cell">Status</th>
                            <th scope="col" className="px-6 py-3"><span className="sr-only">Ações</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="bg-white border-b">
                                    <td className="px-6 py-4"><Skeleton className="h-5 w-40" /></td>
                                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                                    <td className="px-6 py-4 hidden lg:table-cell"><Skeleton className="h-5 w-28" /></td>
                                    <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-5 w-16" /></td>
                                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-full" /></td>
                                </tr>
                            ))
                        ) : isError ? (
                            <tr>
                                <td colSpan="6" className="text-center py-10 text-red-500">
                                    <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                                    Erro ao carregar fornecedores: {error.message}
                                </td>
                            </tr>
                        ) : suppliers.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-10 text-gray-500">
                                    Nenhum fornecedor encontrado.
                                </td>
                            </tr>
                        ) : (
                            suppliers.map((supplier) => (
                            <tr key={supplier._id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-sm font-bold text-gray-600">
                                            {supplier.nomeFantasia.charAt(0)}
                                        </div>
                                        <div>
                                            <p>{supplier.nomeFantasia}</p>
                                            <p className="text-xs text-gray-500">{supplier.razaoSocial}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p>{supplier.contato?.nome}</p>
                                    <p className="text-gray-500 hidden sm:block">{supplier.contato?.telefone}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[supplier.categoria] || categoryColors.default}`}>{supplier.categoria}</span>
                                </td>
                                <td className="px-6 py-4 hidden lg:table-cell font-medium text-gray-700">
                                    {formatCurrency(supplier.totalGasto)}
                                </td>
                                <td className="px-6 py-4 hidden md:table-cell">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${supplier.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {supplier.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(supplier)} className="text-blue-600 hover:text-blue-800">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSupplier(supplier._id)} className="text-red-600 hover:text-red-800">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        )))}
                    </tbody>
                </table>
                {/* Paginação will be implemented later */}
            </Card>

            <AddFornecedorModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveSupplier}
                isSaving={createMutation.isLoading || updateMutation.isLoading}
                supplier={selectedSupplier}
            />
        </div>
    );
};

export default FornecedoresPage;
