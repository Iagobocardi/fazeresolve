import React, { useState, useEffect } from 'react';

// Os estilos foram mantidos aqui para simplicidade, mas poderiam ser movidos para um arquivo CSS.
const ModalStyles = () => (
    <style>{`
        .field-card { background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
        .field-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .field-card-header i { color: #3b82f6; }
        .field-card-header h3 { font-size: 1rem; font-weight: 700; color: #1f2937; }
        .input-group label { display: block; color: #4b5563; font-weight: 500; font-size: 0.875rem; margin-bottom: 6px; }
        .input-field { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; transition: border-color 0.2s, box-shadow 0.2s; font-size: 0.95rem; }
        .input-field:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); outline: none; }
        .btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
        .btn-primary { background-color: #3b82f6; color: white; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25); }
        .btn-primary:hover { background-color: #2563eb; }
        .btn-secondary { background-color: white; color: #374151; border: 1px solid #d1d5db; }
        .btn-secondary:hover { background-color: #f3f4f6; }
        .tooltip:hover .tooltiptext { visibility: visible; opacity: 1; }
    `}</style>
);

const AdicionarItemPessoalModal = ({ isOpen, onClose, onSave, item }) => {
    const [showStockFields, setShowStockFields] = useState(false);

    useEffect(() => {
        // Se um item for passado (para edição), verifica se ele tem dados de estoque
        if (item && item.quantidadeEmEstoque !== undefined) {
            setShowStockFields(true);
        } else if (!item) {
            // Reseta para um novo item
            setShowStockFields(false);
        }
    }, [item]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const itemData = {
            nome: formData.get('item-name'),
            categoria: formData.get('item-category'),
            meuPrecoCusto: parseFloat(formData.get('price-cost')),
            meuPrecoVenda: parseFloat(formData.get('price-sell')),
            fornecedor: formData.get('item-loja'),
            cidadeCompra: formData.get('item-cidade'),
            controlaEstoque: showStockFields,
            quantidadeEmEstoque: showStockFields ? parseInt(formData.get('stock-qty') || 0, 10) : undefined,
            unidade: showStockFields ? formData.get('stock-unit') : undefined,
            estoqueMinimo: showStockFields ? parseInt(formData.get('stock-min') || 0, 10) : undefined,
        };
        onSave(itemData);
    };

    return (
        <>
            <ModalStyles />
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl">
                    <form onSubmit={handleSubmit}>
                        <div className="p-5 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">{item ? 'Editar Item Pessoal' : 'Adicionar Novo Item Pessoal'}</h2>
                            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                        </div>
                        <div className="max-h-[75vh] overflow-y-auto p-6 bg-slate-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                <div className="field-card md:col-span-2">
                                    <div className="field-card-header">
                                        <i className="fas fa-tag"></i>
                                        <h3>Identificação do Item</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="input-group">
                                            <label htmlFor="item-name">Nome do Item</label>
                                            <input id="item-name" name="item-name" type="text" placeholder="Ex: Parafuso Phillips 3.5x40" className="input-field" defaultValue={item?.nome || ''} required />
                                        </div>
                                        <div className="input-group">
                                            <label htmlFor="item-category">Categoria</label>
                                            <select id="item-category" name="item-category" className="input-field" defaultValue={item?.categoria || ''}>
                                                <option value="">Selecione uma categoria</option>
                                                <option value="Parafusos e Fixadores">Parafusos e Fixadores</option>
                                                <option value="Hidráulica">Hidráulica</option>
                                                <option value="Elétrica">Elétrica</option>
                                                <option value="Ferragens">Ferragens</option>
                                                <option value="Tecidos">Tecidos</option>
                                                <option value="Tintas e Acessórios">Tintas e Acessórios</option>
                                                <option value="Outros">Outros</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="field-card">
                                    <div className="field-card-header">
                                        <i className="fas fa-dollar-sign"></i>
                                        <h3>Financeiro</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="input-group">
                                            <label htmlFor="price-cost" className="font-semibold text-red-600">Meu Preço de Custo</label>
                                            <input id="price-cost" name="price-cost" type="number" step="0.01" placeholder="R$ 25,50" className="input-field" defaultValue={item?.meuPrecoCusto || ''} />
                                        </div>
                                        <div className="input-group">
                                            <label htmlFor="price-sell" className="font-semibold text-green-600">Meu Preço de Venda</label>
                                            <input id="price-sell" name="price-sell" type="number" step="0.01" placeholder="R$ 49,90" className="input-field" defaultValue={item?.meuPrecoVenda || ''} />
                                        </div>
                                    </div>
                                </div>

                                <div className="field-card">
                                    <div className="field-card-header">
                                        <i className="fas fa-shopping-cart"></i>
                                        <h3>Detalhes da Compra (Opcional)</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="input-group">
                                            <label htmlFor="item-loja">Loja / Fornecedor</label>
                                            <input id="item-loja" name="item-loja" type="text" placeholder="Ex: Loja do Zé" className="input-field" defaultValue={item?.fornecedor || ''} />
                                        </div>
                                        <div className="input-group">
                                            <label htmlFor="item-cidade">
                                                Cidade da Compra
                                                <span className="tooltip ml-1 relative inline-block">
                                                    <i className="fas fa-info-circle text-slate-400"></i>
                                                    <span className="tooltiptext invisible absolute w-56 bg-gray-800 text-white text-center rounded-md py-2 px-3 z-10 bottom-full left-1/2 -ml-28 opacity-0 transition-opacity duration-300 text-xs">Ao informar a cidade, você ajuda a criar um mapa de preços mais preciso para sua região.</span>
                                                </span>
                                            </label>
                                            <input id="item-cidade" name="item-cidade" type="text" placeholder="Ex: Sorocaba" className="input-field" defaultValue={item?.cidadeCompra || ''} />
                                        </div>
                                    </div>
                                </div>

                                <div className="field-card md:col-span-2">
                                    <div className="field-card-header">
                                        <i className="fas fa-box"></i>
                                        <h3>Estoque</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <input 
                                                id="control-stock-checkbox" 
                                                type="checkbox" 
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                checked={showStockFields}
                                                onChange={(e) => setShowStockFields(e.target.checked)}
                                            />
                                            <label htmlFor="control-stock-checkbox" className="ml-2 block text-sm font-semibold text-slate-700">Controlar este item no estoque?</label>
                                        </div>

                                        {showStockFields && (
                                            <div id="stock-fields" className="space-y-4 pt-4 border-t">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="input-group">
                                                        <label htmlFor="stock-qty">Qtd. em Estoque</label>
                                                        <input id="stock-qty" name="stock-qty" type="number" defaultValue={item?.quantidadeEmEstoque || "1"} className="input-field" />
                                                    </div>
                                                    <div className="input-group">
                                                        <label htmlFor="stock-unit">Unidade</label>
                                                        <select id="stock-unit" name="stock-unit" className="input-field" defaultValue={item?.unidade || 'un'}>
                                                            <option value="un">un</option>
                                                            <option value="m">m</option>
                                                            <option value="caixa">caixa</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="input-group">
                                                    <label htmlFor="stock-min">Estoque Mínimo (Opcional)</label>
                                                    <input id="stock-min" name="stock-min" type="number" placeholder="Ex: 2" className="input-field" defaultValue={item?.estoqueMinimo || ''} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
                            <button type="submit" className="btn btn-primary">Salvar Item</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AdicionarItemPessoalModal;
