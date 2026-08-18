import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getCatalogoMercado, getCatalogoPessoal, createItemPessoal, updateItemPessoal, deleteItemPessoal } from '../../api/catalogoApi';
import { getProdutos } from '../../api/produtosApi';
import AdicionarItemPessoalModal from '../modals/AdicionarItemPessoalModal';


const CatalogoTabela = () => {
    const queryClient = useQueryClient();
    const [areaAtual, setAreaAtual] = useState('Tapeçaria');
    const [activeTab, setActiveTab] = useState('mercado');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('');
    const [currentItem, setCurrentItem] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const { data: catalogoMercado, isLoading: isLoadingMercado } = useQuery({
        queryKey: ['catalogoMercado', areaAtual],
        queryFn: () => getCatalogoMercado(areaAtual),
        enabled: activeTab === 'mercado',
    });

    const { data: produtosEstoque, isLoading: isLoadingEstoque } = useQuery({
        queryKey: ['produtos'],
        queryFn: getProdutos,
        enabled: activeTab === 'pessoal',
    });

    const { data: catalogoPessoal, isLoading: isLoadingPessoal } = useQuery({
        queryKey: ['catalogoPessoal'],
        queryFn: () => getCatalogoPessoal(),
        enabled: activeTab === 'pessoal',
    });

    const meusItens = useMemo(() => {
        const estoque = Array.isArray(produtosEstoque) ? produtosEstoque.map(p => ({ ...p, source: 'estoque' })) : [];
        const pessoal = Array.isArray(catalogoPessoal) ? catalogoPessoal.map(p => ({ ...p, source: 'pessoal' })) : [];
        return [...estoque, ...pessoal];
    }, [produtosEstoque, catalogoPessoal]);

    // Lógica de Paginação
    const paginatedCatalogoMercado = useMemo(() => {
        const items = catalogoMercado?.data || [];
        if (!Array.isArray(items)) return [];
        const startIndex = (currentPage - 1) * itemsPerPage;
        return items.slice(startIndex, startIndex + itemsPerPage);
    }, [catalogoMercado, currentPage, itemsPerPage]);

    const paginatedMeusItens = useMemo(() => {
        if (!meusItens) return [];
        const startIndex = (currentPage - 1) * itemsPerPage;
        return meusItens.slice(startIndex, startIndex + itemsPerPage);
    }, [meusItens, currentPage, itemsPerPage]);

    const totalPagesMercado = catalogoMercado?.data ? Math.ceil(catalogoMercado.data.length / itemsPerPage) : 0;
    const totalPagesMeusItens = meusItens ? Math.ceil(meusItens.length / itemsPerPage) : 0;

    const openModal = (type, item = null) => {
        setModalType(type);
        setCurrentItem(item);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalType('');
        setCurrentItem(null);
    };

    const selecionarArea = (novaArea) => {
        setAreaAtual(novaArea);
        closeModal();
    };

    const createMutation = useMutation({
        mutationFn: createItemPessoal,
        onSuccess: () => {
            toast.success("Item adicionado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['catalogoPessoal'] });
            queryClient.invalidateQueries({ queryKey: ['produtos'] });
            closeModal();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Falha ao adicionar item.");
        }
    });

    const updateMutation = useMutation({
        mutationFn: (item) => updateItemPessoal(item._id, item),
        onSuccess: () => {
            toast.success("Item atualizado com sucesso!");
            queryClient.invalidateQueries({ queryKey: ['catalogoPessoal'] });
            queryClient.invalidateQueries({ queryKey: ['produtos'] });
            closeModal();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Falha ao atualizar item.");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteItemPessoal,
        onSuccess: () => {
            toast.success("Item deletado com sucesso.");
            queryClient.invalidateQueries({ queryKey: ['catalogoPessoal'] });
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Falha ao deletar item.");
        }
    });

    const handleAddItem = (item) => {
        createMutation.mutate({ ...item, status: 'ativo' });
    };

    const handleEditItem = (updatedItem) => {
        updateMutation.mutate(updatedItem);
    };
    
    const handleSaveItem = (itemData) => {
        const itemToSave = currentItem ? { ...currentItem, ...itemData } : itemData;
        
        if (currentItem && modalType !== 'personalizar') {
            handleEditItem(itemToSave);
        } else {
            handleAddItem(itemToSave);
        }
    };

    const handleDeleteItem = (itemId) => {
        if (window.confirm('Tem certeza que deseja excluir este item?')) {
            deleteMutation.mutate(itemId);
        }
    };

    const renderTabelaHeader = () => {
        const headerClasses = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
        if (activeTab === 'mercado') {
            return (
                <tr>
                    <th className={`${headerClasses} w-2/5`}>Nome do Item</th>
                    <th className={`${headerClasses} w-1/5`}>Preço Médio (Mercado)</th>
                    <th className={`${headerClasses} w-1/5`}>Preço Médio (Sua Região)</th>
                    <th className={`${headerClasses} w-1/5`}>Ações</th>
                </tr>
            );
        } else {
            return (
                <tr>
                    <th className={`${headerClasses} w-2/5`}>Nome do Item</th>
                    <th className={`${headerClasses} w-1/5`}>Meu Custo</th>
                    <th className={`${headerClasses} w-1/5`}>Qtd. em Estoque</th>
                    <th className={`${headerClasses} w-1/5`}>Status</th>
                    <th className={`${headerClasses} w-1/5`}>Ações</th>
                </tr>
            );
        }
    };

    const renderTabelaBody = () => {
        const cellClasses = "px-6 py-4 whitespace-nowrap";
        if (activeTab === 'mercado') {
            if (isLoadingMercado) return <tr><td colSpan="4" className="text-center p-4">Carregando...</td></tr>;
            if (!catalogoMercado || !Array.isArray(catalogoMercado.data) || catalogoMercado.data.length === 0) return <tr><td colSpan="4" className="text-center p-4">Nenhum item encontrado para esta área.</td></tr>;

            return paginatedCatalogoMercado.map(item => (
                <tr key={item._id || item.nome} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className={`${cellClasses} font-medium text-gray-900`}>{item.nome}</td>
                    <td className={cellClasses}>{item.precoMedioMin && item.precoMedioMax ? `R$ ${item.precoMedioMin} - R$ ${item.precoMedioMax}`: 'N/A'}</td>
                    <td className={cellClasses}>{item.precoRegiao ? <span className="font-bold text-blue-600">R$ {item.precoRegiao}</span> : <span className="text-slate-400">N/A</span>}</td>
                    <td className={cellClasses}><button onClick={() => openModal('personalizar', item)} className="text-slate-500 hover:text-blue-600" title="Personalizar e Adicionar aos Meus Itens"><i className="fas fa-star"></i></button></td>
                </tr>
            ));
        } else {
            const isLoading = isLoadingEstoque || isLoadingPessoal;
            if (isLoading) return <tr><td colSpan="5" className="text-center p-4">Carregando...</td></tr>;
            if (paginatedMeusItens.length === 0) return <tr><td colSpan="5" className="text-center py-8 text-slate-500">Você ainda não adicionou itens pessoais ou de estoque.</td></tr>;

            return paginatedMeusItens.map(item => (
                <tr key={item._id || item.nome} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className={`${cellClasses} font-medium text-gray-900`}>{item.nome}</td>
                    <td className={`${cellClasses} font-bold text-red-600`}>{item.custoUnitario || item.meuPrecoCusto ? `R$ ${item.custoUnitario || item.meuPrecoCusto}` : 'N/A'}</td>
                    <td className={cellClasses}>
                        {item.source === 'estoque' ? (
                             <div className="flex items-center gap-2"><span className="font-bold">{item.quantidadeEmEstoque} {item.unidade}</span><span className="status-badge status-green">Em Estoque</span></div>
                        ) : (
                            <div className="flex items-center gap-2"><span>-</span><span className="status-badge status-gray">Apenas no Catálogo</span></div>
                        )}
                    </td>
                    <td className={cellClasses}>
                        <span className={`status-badge ${item.status === 'ativo' ? 'status-green' : 'status-red'}`}>{item.status}</span>
                    </td>
                    <td className={cellClasses}>
                        <div className="flex gap-4">
                            <button onClick={() => openModal('novo-pessoal', item)} className="text-slate-500 hover:text-blue-600" title="Editar Item"><i className="fas fa-pencil-alt"></i></button>
                            <button onClick={() => handleDeleteItem(item._id)} className="text-red-500 hover:text-red-700" title="Excluir Item"><i className="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                </tr>
            ));
        }
    };

    const renderPaginationControls = (totalPages) => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-4">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Anterior
                </button>
                <span className="text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Próxima
                </button>
            </div>
        );
    };

    const renderModal = () => {
        if (!isModalOpen) return null;

        if (modalType === 'area') {
            const areas = [
                { name: 'Pedreiro', icon: 'fa-trowel', category: 'Construção & Reforma' },
                { name: 'Pintor', icon: 'fa-paint-roller', category: 'Construção & Reforma' },
                { name: 'Tapeçaria', icon: 'fa-couch', category: 'Construção & Reforma' },
                { name: 'Eletricista', icon: 'fa-bolt', category: 'Construção & Reforma' },
                { name: 'Encanador', icon: 'fa-wrench', category: 'Construção & Reforma' },
                { name: 'Marceneiro', icon: 'fa-ruler-combined', category: 'Construção & Reforma' },
                { name: 'Gesseiro', icon: 'fa-layer-group', category: 'Construção & Reforma' },
                { name: 'Vidraceiro', icon: 'fa-window-maximize', category: 'Construção & Reforma' },
                { name: 'Montador de Móveis', icon: 'fa-box-open', category: 'Serviços Domésticos' },
                { name: 'Chaveiro', icon: 'fa-key', category: 'Serviços Domésticos' },
                { name: 'Técnico de Ar Condicionado', icon: 'fa-wind', category: 'Serviços Domésticos' },
                { name: 'Limpeza Profissional', icon: 'fa-broom', category: 'Serviços Domésticos' },
                { name: 'Jardineiro', icon: 'fa-leaf', category: 'Outros Serviços' },
                { name: 'Serralheiro', icon: 'fa-shield-halved', category: 'Outros Serviços' },
                { name: 'Mecânico', icon: 'fa-car-battery', category: 'Outros Serviços' },
                { name: 'Outros', icon: 'fa-ellipsis', category: 'Outros Serviços' }
            ];

            const groupedAreas = areas.reduce((acc, area) => {
                if (!acc[area.category]) {
                    acc[area.category] = [];
                }
                acc[area.category].push(area);
                return acc;
            }, {});

            return (
                <div id="areaModal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl">
                        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Alterar Área de Atuação</h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                        <div className="p-6 md:p-8">
                            <input type="text" id="searchInput" placeholder="Buscar área de atuação..." className="input-field mb-6" />
                            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                                {Object.entries(groupedAreas).map(([category, areas]) => (
                                    <div key={category} className="area-category">
                                        <h3 className="text-lg font-bold text-slate-600 mb-3">{category}</h3>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                            {areas.map(area => (
                                                <div key={area.name} onClick={() => selecionarArea(area.name)} className={`area-option ${area.name === areaAtual ? 'selected' : ''}`} data-area={area.name}>
                                                    <i className={`fas ${area.icon} icon`}></i>
                                                    <span className="text">{area.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (modalType === 'novo-pessoal' || modalType === 'personalizar') {
            return (
                <AdicionarItemPessoalModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveItem}
                    item={currentItem}
                />
            );
        }

        return null;
    };

    return (
        <div className="space-y-8">
            <div className="card">
                <div className="card-body bg-slate-50 flex flex-wrap gap-4 justify-between items-center">
                    <div>
                        <p className="text-sm text-slate-500">Sua Área de Atuação</p>
                        <p id="area-atuacao-display" className="text-lg font-bold text-slate-800">{areaAtual}</p>
                    </div>
                    <button type="button" id="btn-alterar-area" onClick={() => openModal('area')} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Alterar Área de Atuação</button>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-6">
                            <button type="button" id="tab-mercado" onClick={() => setActiveTab('mercado')} className={`py-3 px-1 border-b-2 font-semibold ${activeTab === 'mercado' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Catálogo de Mercado (Faz&Resolve)</button>
                            <button type="button" id="tab-pessoal" onClick={() => setActiveTab('pessoal')} className={`py-3 px-1 border-b-2 font-semibold ${activeTab === 'pessoal' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Meus Itens & Estoque</button>
                        </nav>
                    </div>
                </div>
                <div className="card-body">
                    <div className="flex justify-between items-center mb-4">
                        <p id="descricao-tabela" className="text-slate-600">Exibindo itens e preços de referência para <strong className="text-slate-800">{areaAtual}</strong>.</p>
                        <button id="btn-novo-item-pessoal" onClick={(e) => { e.preventDefault(); openModal('novo-pessoal'); }} className={`btn btn-primary ${activeTab === 'pessoal' ? '' : 'hidden'}`}><i className="fas fa-plus mr-2"></i> Adicionar Item Pessoal</button>
                    </div>

                    <div id="pessoal-descricao" className={`${activeTab === 'pessoal' ? '' : 'hidden'} mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg`}>
                        <h4 className="font-bold text-blue-800">Gerencie seu Catálogo Pessoal</h4>
                        <p className="text-sm text-blue-700 mt-1">Aqui você controla os itens que utiliza no dia a dia. Adicione produtos, atualize custos, controle o que você tem em estoque e marque itens obsoletos para exclusão, mantendo sua lista sempre limpa e organizada.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead id="tabela-header">
                                {renderTabelaHeader()}
                            </thead>
                            <tbody id="tabela-mercado" className={activeTab === 'mercado' ? '' : 'hidden'}>
                                {renderTabelaBody()}
                            </tbody>
                            <tbody id="tabela-pessoal" className={activeTab === 'pessoal' ? '' : 'hidden'}>
                                {renderTabelaBody()}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4">
                        {activeTab === 'mercado' && renderPaginationControls(totalPagesMercado)}
                        {activeTab === 'pessoal' && renderPaginationControls(totalPagesMeusItens)}
                    </div>
                    <div id="mercado-footer" className={`${activeTab === 'mercado' ? '' : 'hidden'} p-4 mt-4 bg-slate-50 rounded-md text-sm text-slate-600`}>
                        <p className="font-semibold"><i className="fas fa-lightbulb mr-2"></i>Como montamos nosso catálogo?</p>
                        <p className="mt-1">Nossa base de preços é atualizada constantemente através de parcerias com fornecedores, monitoramento de preços online e da contribuição anônima de profissionais como você, garantindo referências de mercado sempre realistas.</p>
                    </div>
                </div>
            </div>
            {renderModal()}
        </div>
    );
};

export default CatalogoTabela;
