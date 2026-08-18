import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { X, Search, Circle, CheckCircle, PlusCircle, Trash2 } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { getModelos } from '../../api/modelosApi';
import SelecionarProdutoModal from './SelecionarProdutoModal';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip);

// Helper functions
const formatCurrency = (value) => {
    const number = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
};

const InputGroup = ({ label, children }) => (
    <div>
        <label className="block text-gray-700 font-medium text-sm mb-1.5">{label}</label>
        {children}
    </div>
);

const CalculadoraOrcamentoModal = ({ isOpen, onClose, materiais: initialMateriais, onApplyPrice }) => {
    const [mode, setMode] = useState('manual');
    const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);
    
    // Manual Mode State
    const [materiais, setMateriais] = useState([]);
    const [custoTerceiros, setCustoTerceiros] = useState(0);
    const [horasEstimadas, setHorasEstimadas] = useState(5);
    const [custoHora, setCustoHora] = useState(50);
    const [margemLucro, setMargemLucro] = useState(100);
    const [custoTotal, setCustoTotal] = useState(0);
    const [lucroEstimado, setLucroEstimado] = useState(0);
    const [precoSugerido, setPrecoSugerido] = useState(0);

    // Model Mode State
    const [selectedModeloId, setSelectedModeloId] = useState('');
    const [modeloParams, setModeloParams] = useState({});
    const [materiaisModelo, setMateriaisModelo] = useState([]);
    const [currentMaterialRequirement, setCurrentMaterialRequirement] = useState(null);
    const [custoTerceirosModelo, setCustoTerceirosModelo] = useState(0);
    const [horasModelo, setHorasModelo] = useState(0);
    const [custoHoraModelo, setCustoHoraModelo] = useState(50);
    const [margemLucroModelo, setMargemLucroModelo] = useState(100);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            const initialManualMateriais = (Array.isArray(initialMateriais) ? initialMateriais : []).map(item => ({
                id: item.produtoId || item.id || Math.random().toString(),
                nome: item.nome,
                quantidade: Number(item.qtd) || 1,
                custo: Number(item.precoUnit) || 0,
                origem: item.origem || 'Estoque'
            }));
            setMateriais(initialManualMateriais);
            setCustoTerceiros(0);
            setHorasEstimadas(5);
            setCustoHora(50);
            setMargemLucro(100);
            setCustoTotal(0);
            setLucroEstimado(0);
            setPrecoSugerido(0);
            setSelectedModeloId('');
            setModeloParams({});
            setMateriaisModelo([]);
            setCustoTerceirosModelo(0);
            setHorasModelo(0);
            setCustoHoraModelo(50);
            setMargemLucroModelo(100);
        }
    }, [isOpen, initialMateriais]);

    // Fetch models
    const { data: modelosData, isLoading: isLoadingModelos } = useQuery({
        queryKey: ['modelos'],
        queryFn: () => getModelos().then(res => res.data),
        enabled: isOpen,
    });
    const modelos = useMemo(() => Array.isArray(modelosData) ? modelosData : [], [modelosData]);
    const selectedModelo = useMemo(() => modelos.find(m => m._id === selectedModeloId), [modelos, selectedModeloId]);

    useEffect(() => {
        if (selectedModelo) {
            setHorasModelo(selectedModelo.maoDeObra?.horas || 0);
            const initialMateriais = Array.isArray(selectedModelo.materiais) ? selectedModelo.materiais.map(m => ({...m, fulfilled: false, selectedProduct: null})) : [];
            setMateriaisModelo(initialMateriais);
            setModeloParams({}); // Reset params when model changes
        } else {
            setMateriaisModelo([]);
            setHorasModelo(0);
        }
    }, [selectedModelo]);

    const custoTotalMateriaisModelo = useMemo(() => materiaisModelo.reduce((acc, item) => acc + ((item.selectedProduct?.custo || 0) * item.quantidade), 0), [materiaisModelo]);
    const custoMaoDeObraModelo = useMemo(() => horasModelo * custoHoraModelo, [horasModelo, custoHoraModelo]);
    const custoTotalModelo = useMemo(() => custoTotalMateriaisModelo + custoTerceirosModelo + custoMaoDeObraModelo, [custoTotalMateriaisModelo, custoTerceirosModelo, custoMaoDeObraModelo]);
    const lucroModelo = useMemo(() => custoTotalModelo * (margemLucroModelo / 100), [custoTotalModelo, margemLucroModelo]);
    const precoSugeridoModelo = useMemo(() => custoTotalModelo + lucroModelo, [custoTotalModelo, lucroModelo]);

    const handleCalculateManual = () => {
        const custoTotalMateriais = materiais.reduce((acc, item) => acc + (item.quantidade * item.custo), 0);
        const custoMaoDeObra = horasEstimadas * custoHora;
        const total = custoTotalMateriais + custoTerceiros + custoMaoDeObra;
        const lucro = total * (margemLucro / 100);
        setCustoTotal(total);
        setLucroEstimado(lucro);
        setPrecoSugerido(total + lucro);
        toast.success('Preço sugerido calculado!');
    };
    
    const handleApplyPrice = () => {
        const price = mode === 'manual' ? precoSugerido : precoSugeridoModelo;
        if (price > 0) {
            onApplyPrice(price);
            onClose();
        } else {
            toast.error("Calcule um preço antes de aplicar.");
        }
    };

    const handleOpenProdutoModal = (materialReq = null) => {
        setCurrentMaterialRequirement(materialReq);
        setIsProdutoModalOpen(true);
    };

    const handleSelectProduto = (produto) => {
        if (mode === 'manual') {
            setMateriais(prev => [...prev, {
                id: produto._id || Math.random().toString(),
                nome: produto.nome,
                quantidade: 1,
                custo: produto.custo,
                origem: produto.source || 'Catálogo'
            }]);
            toast.success(`${produto.nome} adicionado!`);
        } else if (mode === 'modelo' && currentMaterialRequirement) {
            setMateriaisModelo(prev => prev.map(mat => mat.nomeRequisito === currentMaterialRequirement.nomeRequisito ? { ...mat, selectedProduct: produto, fulfilled: true } : mat));
            toast.success(`${produto.nome} selecionado!`);
        }
        setIsProdutoModalOpen(false);
        setCurrentMaterialRequirement(null);
    };

    const handleMaterialChange = (id, field, value) => {
        setMateriais(prev => prev.map(mat => mat.id === id ? { ...mat, [field]: parseFloat(value) || 0 } : mat));
    };
    
    const handleParamChange = (paramName, value) => {
        setModeloParams(prev => ({ ...prev, [paramName]: value }));
    };

    const handleRemoveMaterial = (id) => {
        setMateriais(prev => prev.filter(mat => mat.id !== id));
    };
    
    if (!isOpen) return null;

    const manualChartData = {
        datasets: [{
            data: [custoTotal > 0 ? custoTotal : 1, lucroEstimado > 0 ? lucroEstimado : 0.0001],
            backgroundColor: ['#FCA5A5', '#4ADE80'],
            borderWidth: 0,
        }],
    };
    const chartOptions = { responsive: true, cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } } };

    return (
        <>
            <SelecionarProdutoModal isOpen={isProdutoModalOpen} onClose={() => setIsProdutoModalOpen(false)} onSelectProduto={handleSelectProduto} />
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col">
                    <div className="p-5 border-b flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-800">Calculadora de Preço de Venda</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                        <div className="bg-gray-200 rounded-lg p-1 flex space-x-1 w-fit mb-6">
                            <button onClick={() => setMode('manual')} className={`px-4 py-1.5 rounded-md font-semibold text-sm transition-all duration-200 ${mode === 'manual' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-600'}`}>Cálculo Manual</button>
                            <button onClick={() => setMode('modelo')} className={`px-4 py-1.5 rounded-md font-semibold text-sm transition-all duration-200 ${mode === 'modelo' ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-600'}`}>Usar Modelo de Serviço</button>
                        </div>

                        {mode === 'manual' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h4 className="text-base font-semibold text-gray-700">1. Custos Diretos Estimados</h4>
                                    <div className="space-y-4">
                                        <InputGroup label="Custo com Materiais"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} /><input type="text" placeholder="Buscar Material no Estoque / Catálogo" onFocus={() => handleOpenProdutoModal(null)} className="input-field pl-10 cursor-pointer" readOnly /></div></InputGroup>
                                        <div className="space-y-3 max-h-40 overflow-y-auto pr-2">{materiais.map((item) => (<div key={item.id} className="p-3 bg-slate-50 border rounded-md text-sm space-y-2"><div className="flex justify-between items-start"><div><p className="font-semibold text-slate-800">{item.nome}</p><p className="text-xs text-green-700 font-medium">{item.origem}</p></div><button onClick={() => handleRemoveMaterial(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></div><div className="flex items-center gap-3"><div className="flex-1"><label className="text-xs text-slate-500">Qtd.</label><input type="number" value={item.quantidade} onChange={e => handleMaterialChange(item.id, 'quantidade', e.target.value)} className="w-full p-1 border rounded-md" /></div><div className="flex-1"><label className="text-xs text-slate-500">Custo Unit.</label><input type="number" value={item.custo} onChange={e => handleMaterialChange(item.id, 'custo', e.target.value)} className="w-full p-1 border rounded-md" /></div><div className="text-right"><label className="text-xs text-slate-500">Total</label><p className="font-bold text-slate-800">{formatCurrency(item.quantidade * item.custo)}</p></div></div></div>))}</div>
                                        <InputGroup label="Custo com Terceiros / Ajudantes"><input type="number" value={custoTerceiros} onChange={e => setCustoTerceiros(parseFloat(e.target.value) || 0)} className="input-field" /></InputGroup>
                                    </div>
                                    <h4 className="text-base font-semibold text-gray-700">2. Sua Mão de Obra</h4>
                                    <div className="grid grid-cols-2 gap-4"><InputGroup label="Horas Estimadas"><input type="number" value={horasEstimadas} onChange={e => setHorasEstimadas(parseFloat(e.target.value) || 0)} className="input-field" /></InputGroup><InputGroup label="Seu Custo por Hora (R$)"><input type="number" value={custoHora} onChange={e => setCustoHora(parseFloat(e.target.value) || 0)} className="input-field" /></InputGroup></div>
                                    <h4 className="text-base font-semibold text-gray-700">3. Defina seu Lucro</h4>
                                    <InputGroup label="Margem de Lucro (%)"><input type="number" value={margemLucro} onChange={e => setMargemLucro(parseFloat(e.target.value) || 0)} className="input-field" /></InputGroup>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-lg flex flex-col justify-between text-center">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-700">Resumo da Precificação</h3>
                                        <div className="my-6 mx-auto w-40 h-40 flex items-center justify-center relative"><Doughnut data={manualChartData} options={chartOptions} /><div className="absolute text-center"><span className="font-bold text-gray-700">Preço Sugerido</span><p className="text-2xl font-extrabold text-gray-800">{formatCurrency(precoSugerido)}</p></div></div>
                                        <div className="space-y-2 text-left max-w-xs mx-auto"><div className="flex justify-between items-center text-gray-600"><span><Circle className="text-red-400 mr-2 inline" size={10} fill="#FCA5A5" />Custo Total</span><span className="font-medium text-gray-800">{formatCurrency(custoTotal)}</span></div><div className="flex justify-between items-center text-gray-600"><span><Circle className="text-green-400 mr-2 inline" size={10} fill="#4ADE80" />Lucro Estimado</span><span className="font-medium text-gray-800">{formatCurrency(lucroEstimado)}</span></div></div>
                                    </div>
                                    <div className="space-y-3 mt-8"><button onClick={handleCalculateManual} className="btn btn-secondary w-full">Calcular Preço Sugerido</button><button onClick={handleApplyPrice} disabled={!precoSugerido} className="btn btn-primary w-full disabled:opacity-50">Aplicar Preço ao Orçamento</button></div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6 border-r pr-8 border-gray-200">
                                    <div>
                                        <h4 className="text-base font-semibold text-gray-700 mb-4">1. Ponto de Partida (Modelo)</h4>
                                        <div className="space-y-4">
                                            <InputGroup label="Selecione o Modelo"><select className="input-field" value={selectedModeloId} onChange={e => setSelectedModeloId(e.target.value)} disabled={isLoadingModelos}><option value="">{isLoadingModelos ? "Carregando..." : "Selecione um modelo"}</option>{modelos.map(m => <option key={m._id} value={m._id}>{m.nome}</option>)}</select></InputGroup>
                                            {selectedModelo && Array.isArray(selectedModelo.parametros) && selectedModelo.parametros.map(param => (
                                                <InputGroup key={param.nome} label={param.nome}>
                                                    <select className="input-field" value={modeloParams[param.nome] || ''} onChange={e => handleParamChange(param.nome, e.target.value)}>
                                                        <option value="">Selecione...</option>
                                                        {Array.isArray(param.opcoes) && param.opcoes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                </InputGroup>
                                            ))}
                                        </div>
                                    </div>
                                    {selectedModelo && (
                                    <>
                                        <div>
                                            <h4 className="text-base font-semibold text-gray-700 mb-4 pt-4 border-t">2. Seleção de Materiais do Modelo</h4>
                                            <div className="space-y-4">
                                                {Array.isArray(materiaisModelo) && materiaisModelo.map((mat, idx) => (
                                                    <InputGroup key={idx} label={`${mat.nomeRequisito} (${mat.quantidade}${mat.unidadeMedida} necessários)`}>
                                                        <button onClick={() => handleOpenProdutoModal(mat)} className={`w-full text-left p-3 font-semibold border-2 border-dashed rounded-md transition-colors flex items-center ${mat.fulfilled ? 'border-green-400 bg-green-50 text-green-800' : 'border-gray-300 text-blue-600 hover:bg-blue-50'}`}>
                                                            {mat.fulfilled ? <CheckCircle className="mr-2" /> : <PlusCircle className="mr-2" />}
                                                            {mat.fulfilled ? mat.selectedProduct.nome : 'Selecionar Produto'}
                                                        </button>
                                                    </InputGroup>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-base font-semibold text-gray-700 mb-4 pt-4 border-t">3. Custos Adicionais e Lucro</h4>
                                            <div className="space-y-4">
                                                <InputGroup label="Custo com Terceiros / Ajudantes"><input type="number" value={custoTerceirosModelo} onChange={e => setCustoTerceirosModelo(parseFloat(e.target.value) || 0)} className="input-field" /></InputGroup>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <InputGroup label="Horas Estimadas"><input type="number" value={horasModelo} onChange={e => setHorasModelo(parseFloat(e.target.value) || 0)} className="input-field bg-blue-50 border-blue-200" /><p className="text-xs text-blue-600 mt-1">Sugerido</p></InputGroup>
                                                    <InputGroup label="Seu Custo por Hora (R$)"><input type="number" value={custoHoraModelo} onChange={e => setCustoHoraModelo(parseFloat(e.target.value) || 0)} className="input-field" /></InputGroup>
                                                </div>
                                                <InputGroup label="Margem de Lucro (%)"><input type="number" value={margemLucroModelo} onChange={e => setMargemLucroModelo(parseFloat(e.target.value) || 0)} className="input-field" /></InputGroup>
                                            </div>
                                        </div>
                                    </>
                                    )}
                                </div>
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h3 className="font-bold text-lg mb-4 text-center text-gray-700">Resumo do Cálculo</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between"><span>Custo c/ Materiais</span><span className="font-medium">{formatCurrency(custoTotalMateriaisModelo)}</span></div>
                                        <div className="flex justify-between"><span>Custo c/ Terceiros</span><span className="font-medium">{formatCurrency(custoTerceirosModelo)}</span></div>
                                        <div className="flex justify-between"><span>Sua Mão de Obra ({horasModelo}h)</span><span className="font-medium">{formatCurrency(custoMaoDeObraModelo)}</span></div>
                                        <hr className="my-2 border-dashed" />
                                        <div className="flex justify-between font-semibold text-base"><span>CUSTO TOTAL</span><span>{formatCurrency(custoTotalModelo)}</span></div>
                                        <div className="flex justify-between text-green-600"><span>+ Lucro ({margemLucroModelo}%)</span><span className="font-medium">{formatCurrency(lucroModelo)}</span></div>
                                    </div>
                                    <div className="mt-6 border-t-2 border-gray-300 pt-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-base font-bold text-gray-800">PREÇO SUGERIDO</span>
                                            <span className="text-3xl font-extrabold text-blue-600">{formatCurrency(precoSugeridoModelo)}</span>
                                        </div>
                                    </div>
                                    <div className="mt-6"><button onClick={handleApplyPrice} className="btn btn-primary w-full">Aplicar Preço ao Orçamento</button></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CalculadoraOrcamentoModal;
