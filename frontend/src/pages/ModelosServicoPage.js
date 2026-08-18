import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getModelos, deleteModelo, createModelo, updateModelo } from '../api/modelosApi';

// Main Component
const ModelosServicoPage = () => {
    const [view, setView] = useState('list'); // 'list' or 'edit'
    const [selectedModelo, setSelectedModelo] = useState(null);
    const queryClient = useQueryClient();

    const { data: modelos = [], isLoading, error } = useQuery({
        queryKey: ['modelos'],
        queryFn: () => getModelos().then(res => res.data || [])
    });

    const deleteMutation = useMutation({
        mutationFn: deleteModelo,
        onSuccess: () => {
            toast.success('Modelo deletado com sucesso!');
            queryClient.invalidateQueries(['modelos']);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Falha ao deletar modelo.');
        }
    });

    const handleEdit = (modelo) => {
        setSelectedModelo(modelo);
        setView('edit');
    };

    const handleCreateNew = () => {
        setSelectedModelo(null);
        setView('edit');
    };

    const handleDelete = (id) => {
        if (window.confirm('Tem certeza que deseja deletar este modelo?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedModelo(null);
    };
    
    if (isLoading) return <div className="text-center p-8">Carregando...</div>;
    if (error) return <div className="text-center p-8 text-red-500">Ocorreu um erro: {error.message}</div>;

    return (
        <div className="guide-container">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-800">Guia de Implementação: Modelos de Serviço</h1>
                <p className="text-slate-600 mt-2 text-lg">Design profissional e inteligente para a seção de criação e gerenciamento de modelos.</p>
            </div>
            {view === 'list' ? (
                <ListagemView modelos={modelos} onEdit={handleEdit} onCreateNew={handleCreateNew} onDelete={handleDelete} />
            ) : (
                <EdicaoView modelo={selectedModelo} onBack={handleBackToList} queryClient={queryClient} />
            )}
        </div>
    );
};

// List View Component
const ListagemView = ({ modelos, onEdit, onCreateNew, onDelete }) => (
    <div id="listagem-modelos" className="mb-16">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Meus Modelos de Serviço</h2>
        <div className="card">
            <div className="card-header flex justify-between items-center">
                <p className="text-slate-600">Crie e gerencie os modelos que automatizam seus orçamentos.</p>
                <button id="btn-novo-modelo" onClick={onCreateNew} className="btn btn-primary"><i className="fas fa-plus mr-2"></i> Novo Modelo</button>
            </div>
            <div className="divide-y divide-slate-200">
                {modelos && modelos.length > 0 ? modelos.map(modelo => (
                    <div key={modelo._id} className="p-6 flex justify-between items-center hover:bg-slate-50">
                        <div>
                            <p className="font-bold text-lg text-slate-800">{modelo.nome}</p>
                            <p className="text-sm text-slate-500">
                                {modelo.parametros?.length || 0} Parâmetros, {modelo.regrasCusto?.length || 0} Regras de Custo
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={() => onEdit(modelo)} className="text-slate-500 hover:text-blue-600"><i className="fas fa-pencil-alt"></i></button>
                            <button onClick={() => onDelete(modelo._id)} className="text-slate-500 hover:text-red-600"><i className="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                )) : (
                     <div className="p-6 text-center text-slate-500">Você ainda não criou nenhum modelo.</div>
                )}
            </div>
        </div>
    </div>
);

// Edit/Create View Component
const EdicaoView = ({ modelo, onBack, queryClient }) => {
    const [nome, setNome] = useState('');
    const [parametros, setParametros] = useState([]);
    const [regrasCusto, setRegrasCusto] = useState([]);
    const [materiais, setMateriais] = useState([]);
    
    // Form states
    const [showParamForm, setShowParamForm] = useState(false);
    const [paramName, setParamName] = useState('');
    const [paramOptions, setParamOptions] = useState([]);
    const [newOption, setNewOption] = useState('');

    const [showRegraMaoDeObraForm, setShowRegraMaoDeObraForm] = useState(false);
    const [newRegraMaoDeObra, setNewRegraMaoDeObra] = useState({ condicaoParam: '', condicaoOpcao: '', acao: 'aumenta em', valor: '' });

    const [showReqMaterialForm, setShowReqMaterialForm] = useState(false);
    const [newReqMaterial, setNewReqMaterial] = useState({ nome: '', unidade: 'm', quantidadePadrao: '' });


    useEffect(() => {
        if (modelo) {
            setNome(modelo.nome || '');
            setParametros(modelo.parametros || []);
            setRegrasCusto(modelo.regrasCusto || []);
            setMateriais(modelo.materiais || []);
        } else {
            // Reset state for new model
            setNome('');
            setParametros([]);
            setRegrasCusto([]);
            setMateriais([]);
        }
    }, [modelo]);

    const { mutate, isPending } = useMutation({
        mutationFn: (data) => modelo?._id ? updateModelo(modelo._id, data) : createModelo(data),
        onSuccess: () => {
            toast.success(`Modelo ${modelo?._id ? 'atualizado' : 'criado'} com sucesso!`);
            queryClient.invalidateQueries(['modelos']);
            onBack();
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Falha ao salvar modelo.')
    });

    const handleAddOption = () => {
        if (newOption.trim()) {
            setParamOptions([...paramOptions, newOption.trim()]);
            setNewOption('');
        }
    };

    const handleSaveParam = () => {
        if (!paramName.trim()) return toast.error("O nome do parâmetro é obrigatório.");
        setParametros([...parametros, { nome: paramName, tipo: 'Lista de Opções', opcoes: paramOptions }]);
        setParamName(''); setParamOptions([]); setShowParamForm(false);
    };

    const handleSaveRegraMaoDeObra = () => {
        if(!newRegraMaoDeObra.condicaoParam || !newRegraMaoDeObra.condicaoOpcao || !newRegraMaoDeObra.valor) return toast.error("Preencha todos os campos da regra.");
        setRegrasCusto([...regrasCusto, { tipo: 'mao_de_obra', ...newRegraMaoDeObra }]);
        setNewRegraMaoDeObra({ condicaoParam: '', condicaoOpcao: '', acao: 'aumenta em', valor: '' });
        setShowRegraMaoDeObraForm(false);
    };

    const handleSaveReqMaterial = () => {
        if(!newReqMaterial.nome || !newReqMaterial.quantidadePadrao) return toast.error("Preencha o nome e a quantidade do requisito.");
        setMateriais([...materiais, newReqMaterial]);
        setNewReqMaterial({ nome: '', unidade: 'm', quantidadePadrao: '' });
        setShowReqMaterialForm(false);
    };

    const handleSaveModel = () => {
        if (!nome.trim()) return toast.error("O nome do modelo é obrigatório.");
        mutate({ nome, parametros, regrasCusto, materiais });
    };

    const ResumoModelo = () => (
        <div className="card sticky top-8">
            <div className="card-header"><h3 className="text-lg font-semibold text-slate-700"><i className="fas fa-bolt mr-2 text-blue-500"></i> Resumo do Modelo</h3></div>
            <div className="card-body space-y-4">
                {parametros.length === 0 && regrasCusto.length === 0 && materiais.length === 0 ? (
                    <p className="text-center text-slate-500">Comece adicionando parâmetros para construir a lógica do seu modelo.</p>
                ) : (
                    <>
                        {parametros.length > 0 && <div><h4 className="font-semibold text-slate-600">Parâmetros</h4>{parametros.map((p, i) => <p key={i} className="text-sm text-slate-500 ml-2">- {p.nome} ({p.opcoes.join(', ')})</p>)}</div>}
                        {regrasCusto.length > 0 && <div><h4 className="font-semibold text-slate-600 mt-3">Regras de Custo</h4>{regrasCusto.map((r, i) => <p key={i} className="text-sm text-slate-500 ml-2">- Se {r.condicaoParam} for {r.condicaoOpcao}, {r.acao} {r.valor}h</p>)}</div>}
                        {materiais.length > 0 && <div><h4 className="font-semibold text-slate-600 mt-3">Materiais</h4>{materiais.map((m, i) => <p key={i} className="text-sm text-slate-500 ml-2">- {m.nome} ({m.quantidadePadrao} {m.unidade})</p>)}</div>}
                    </>
                )}
            </div>
            <div className="card-footer text-right">
                <button onClick={handleSaveModel} disabled={isPending} className="btn btn-primary w-full">
                    <i className="fas fa-save mr-2"></i> {isPending ? 'Salvando...' : 'Salvar Modelo'}
                </button>
            </div>
        </div>
    );

    return (
        <div id="edicao-modelo">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">{modelo ? 'Editar Modelo' : 'Criar Novo Modelo'}</h2>
                <button id="btn-voltar" onClick={onBack} className="btn btn-secondary text-sm"><i className="fas fa-arrow-left mr-2"></i> Voltar para a Lista</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    {/* Step 1: Info & Parameters */}
                    <div className="card">
                        <div className="card-body space-y-6">
                            <h4 className="text-lg font-bold text-slate-800 mb-1"><span className="bg-blue-600 text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-3">1</span>Informações e Parâmetros</h4>
                            <div className="ml-11 space-y-6">
                                <div className="space-y-2"><label htmlFor="model-name" className="font-semibold text-slate-700">Nome do Modelo</label><input id="model-name" type="text" placeholder="Ex: Reforma de Sofá" className="input-field max-w-lg" value={nome} onChange={e => setNome(e.target.value)} /></div>
                                <div id="parametros-container" className="space-y-4">
                                    {parametros.map((param, index) => (
                                        <div key={index} className="p-4 border rounded-md bg-slate-50"><label className="font-semibold text-slate-700">Parâmetro: "{param.nome}"</label><p className="text-sm text-slate-500 mb-3">Tipo: Lista de Opções</p><div className="flex flex-wrap gap-2">{param.opcoes.map(opt => <span key={opt} className="tag">{opt}</span>)}</div></div>
                                    ))}
                                </div>
                                {!showParamForm ? <button id="btn-add-parametro" onClick={() => setShowParamForm(true)} className="btn btn-secondary text-sm"><i className="fas fa-plus mr-2"></i> Adicionar Parâmetro</button>
                                : <div className="p-4 border-2 border-dashed rounded-md bg-slate-50 space-y-4">
                                    <h5 className="font-semibold text-slate-700">Novo Parâmetro</h5>
                                    <div><label htmlFor="param-name">Nome do Parâmetro</label><input id="param-name" type="text" placeholder="Ex: Complexidade" className="input-field mt-1" value={paramName} onChange={e => setParamName(e.target.value)} /></div>
                                    <div><label className="font-medium text-slate-700 text-sm">Opções da Lista</label><div className="mt-2 flex flex-wrap gap-2 mb-2">{paramOptions.map((opt, i) => <span key={i} className="tag">{opt} <button onClick={() => setParamOptions(paramOptions.filter(o => o !== opt))}>×</button></span>)}</div><div className="flex gap-2"><input type="text" placeholder="Digite uma opção e tecle Enter" className="input-field" value={newOption} onChange={e => setNewOption(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddOption())} /></div></div>
                                    <div className="flex gap-2 justify-end"><button onClick={() => setShowParamForm(false)} className="btn btn-secondary">Cancelar</button><button onClick={handleSaveParam} className="btn btn-primary">Adicionar</button></div>
                                </div>}
                            </div>
                        </div>
                    </div>
                    {/* Step 2: Cost Rules */}
                    <div className="card">
                        <div className="card-body space-y-6">
                            <h4 className="text-lg font-bold text-slate-800 mb-1"><span className="bg-blue-600 text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-3">2</span>Regras de Custo</h4>
                            <div className="ml-11 space-y-6">
                                <div className="space-y-4"><h5 className="font-semibold text-slate-700">Mão de Obra</h5><div className="flex items-center gap-4"><label className="font-medium text-slate-600">Horas de trabalho base:</label><input type="number" placeholder="Ex: 8" className="input-field w-24" /></div>
                                    <div className="space-y-3">{regrasCusto.map((r, i) => <div key={i} className="rule-card">Regra: Se {r.condicaoParam} for {r.condicaoOpcao}...</div>)}</div>
                                    {!showRegraMaoDeObraForm ? <button onClick={() => setShowRegraMaoDeObraForm(true)} className="btn btn-secondary btn-sm text-xs"><i className="fas fa-plus mr-2"></i> Adicionar Regra de Mão de Obra</button>
                                    : <div className="p-4 border-2 border-dashed rounded-md bg-slate-50 space-y-4">
                                        <h5 className="font-semibold text-slate-700">Nova Regra de Mão de Obra</h5>
                                        <div className="flex flex-wrap items-center gap-3"><span>Quando</span><select className="input-field w-40" value={newRegraMaoDeObra.condicaoParam} onChange={e => setNewRegraMaoDeObra({...newRegraMaoDeObra, condicaoParam: e.target.value, condicaoOpcao: ''})}><option value="">Selecione Parâmetro</option>{parametros.map(p=><option key={p.nome} value={p.nome}>{p.nome}</option>)}</select><span>for</span><select className="input-field w-32" value={newRegraMaoDeObra.condicaoOpcao} onChange={e => setNewRegraMaoDeObra({...newRegraMaoDeObra, condicaoOpcao: e.target.value})} disabled={!newRegraMaoDeObra.condicaoParam}><option value="">Selecione Opção</option>{(parametros.find(p=>p.nome===newRegraMaoDeObra.condicaoParam)?.opcoes || []).map(o=><option key={o} value={o}>{o}</option>)}</select><span>a mão de obra</span><select className="input-field w-32" value={newRegraMaoDeObra.acao} onChange={e => setNewRegraMaoDeObra({...newRegraMaoDeObra, acao: e.target.value})}><option>aumenta em</option><option>diminui em</option><option>será de</option></select><input type="number" placeholder="Valor" className="input-field w-20" value={newRegraMaoDeObra.valor} onChange={e => setNewRegraMaoDeObra({...newRegraMaoDeObra, valor: e.target.value})} /><span>horas</span></div>
                                        <div className="flex gap-2 justify-end"><button onClick={() => setShowRegraMaoDeObraForm(false)} className="btn btn-secondary">Cancelar</button><button onClick={handleSaveRegraMaoDeObra} className="btn btn-primary">Adicionar Regra</button></div>
                                    </div>}
                                </div>
                                <div className="space-y-4 pt-6 border-t"><h5 className="font-semibold text-slate-700">Materiais Necessários</h5>
                                    <div className="space-y-3">{materiais.map((m, i) => <div key={i} className="rule-card">{m.nome} ({m.quantidadePadrao} {m.unidade})</div>)}</div>
                                    {!showReqMaterialForm ? <button onClick={() => setShowReqMaterialForm(true)} className="btn btn-secondary btn-sm text-xs"><i className="fas fa-plus mr-2"></i> Adicionar Requisito de Material</button>
                                    : <div className="p-4 border-2 border-dashed rounded-md bg-slate-50 space-y-4">
                                        <h5 className="font-semibold text-slate-700">Novo Requisito de Material</h5>
                                        <div className="grid grid-cols-3 gap-4"><div className="col-span-2"><label>Nome do Requisito</label><input type="text" placeholder="Ex: Tecido Principal" className="input-field mt-1" value={newReqMaterial.nome} onChange={e=>setNewReqMaterial({...newReqMaterial, nome: e.target.value})}/></div><div><label>Unidade</label><select className="input-field mt-1" value={newReqMaterial.unidade} onChange={e=>setNewReqMaterial({...newReqMaterial, unidade: e.target.value})}><option>m</option><option>un</option></select></div></div>
                                        <div><label>Quantidade Padrão</label><input type="number" placeholder="10" className="input-field mt-1 w-24" value={newReqMaterial.quantidadePadrao} onChange={e=>setNewReqMaterial({...newReqMaterial, quantidadePadrao: e.target.value})}/></div>
                                        <div className="flex gap-2 justify-end"><button onClick={() => setShowReqMaterialForm(false)} className="btn btn-secondary">Cancelar</button><button onClick={handleSaveReqMaterial} className="btn btn-primary">Adicionar Requisito</button></div>
                                    </div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <ResumoModelo />
                </div>
            </div>
        </div>
    );
};

export default ModelosServicoPage;
