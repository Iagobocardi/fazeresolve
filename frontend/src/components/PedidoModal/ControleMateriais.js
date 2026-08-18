import React from 'react';

const TrashIcon = () => <i className="fas fa-trash"></i>;

const ControleMateriais = ({
    pedido,
    getNumericValue,
    handleRemoveMaterial,
    produtosDisponiveis,
    produtoSelecionadoId,
    setProdutoSelecionadoId,
    quantidadeUsada,
    setQuantidadeUsada,
    handleAdicionarMaterial,
    isAddingMaterial,
}) => {
    return (
        <div>
            <h2 className="font-bold text-xl text-gray-800 mb-4">Controle de Materiais</h2>
            <div className="bg-slate-50 p-6 rounded-lg border">
                <p className="text-sm text-gray-600 mb-4">Adicione materiais do seu estoque que serão utilizados neste serviço.</p>
                <form onSubmit={handleAdicionarMaterial} className="flex flex-wrap gap-4 items-end">
                    <div className="flex-grow">
                        <label htmlFor="produto" className="text-sm font-medium text-gray-700">Adicionar Produto</label>
                        <select 
                            id="produto" 
                            value={produtoSelecionadoId} 
                            onChange={(e) => setProdutoSelecionadoId(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                            {produtosDisponiveis && produtosDisponiveis.length > 0 ? (
                                produtosDisponiveis.map(p => (<option key={p._id} value={p._id}>{p.nome} ({p.quantidadeEmEstoque} disp.)</option>))
                            ) : (
                                <option disabled>Nenhum produto em estoque</option>
                            )}
                        </select>
                    </div>
                    <div className="w-24">
                         <label htmlFor="qtd" className="text-sm font-medium text-gray-700">Qtd.</label>
                        <input 
                            type="number" 
                            id="qtd" 
                            value={quantidadeUsada} 
                            onChange={(e) => setQuantidadeUsada(e.target.value)} 
                            min="1"
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isAddingMaterial}
                        className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 transition-colors h-10"
                    >
                        {isAddingMaterial ? '...' : 'Adicionar'}
                    </button>
                </form>

                {pedido.materiaisUsados && pedido.materiaisUsados.length > 0 && (
                    <div className="mt-6">
                        <h3 className="font-semibold text-gray-700 mb-2">Materiais Alocados:</h3>
                        <ul className="space-y-2 text-sm">
                            {pedido.materiaisUsados.map((item) => (
                                <li key={item._id} className="flex justify-between items-center p-2 bg-white rounded border">
                                    <span>{item.produto?.nome || 'Produto Removido'}</span>
                                    <div className="flex items-center gap-4">
                                        <span>{getNumericValue(item.quantidade)} un.</span>
                                        <button onClick={() => handleRemoveMaterial(item._id)} className="text-gray-400 hover:text-red-500">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ControleMateriais;
