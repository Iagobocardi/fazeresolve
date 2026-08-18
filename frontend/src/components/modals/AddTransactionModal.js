import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from '../../api/apiClient';
import { fetchFornecedores } from '../../api/fornecedoresApi';

const AddTransactionModal = ({ isOpen, onClose }) => {
  // State for form fields
  const [tipo, setTipo] = useState('Receita');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState('Venda de Produto');
  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  const [fornecedorId, setFornecedorId] = useState(''); // New state for supplier
  const [comprovante, setComprovante] = useState(null);
  const [comprovanteName, setComprovanteName] = useState('');
  
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // Fetch suppliers for the dropdown
  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: fetchFornecedores,
    // Only fetch when the modal is open and it's an expense
    enabled: isOpen && tipo === 'Despesa',
  });

  const addTransactionMutation = useMutation({
    mutationFn: (newTransaction) => {
      const formData = new FormData();
      
      // Append all fields to formData
      Object.keys(newTransaction).forEach(key => {
        if (key === 'comprovante' && newTransaction[key]) {
          formData.append('comprovante', newTransaction[key]);
        } else if (key !== 'comprovante') {
          formData.append(key, newTransaction[key]);
        }
      });

      return apiClient.post('/financeiro/transacoes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiroHistorico'] });
      queryClient.invalidateQueries({ queryKey: ['financeiroResumo'] });
      toast.success('Transação adicionada com sucesso!');
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Ocorreu um erro ao adicionar a transação.');
    },
  });
  
  const handleValorChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setValor('');
      return;
    }
    value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    setValor(value);
  };

  const setDate = (offset) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + offset);
    setData(newDate.toISOString().split('T')[0]);
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setComprovante(file);
      setComprovanteName(file.name);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const valorNumerico = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
    
    const transactionData = {
      tipo,
      valor: valorNumerico,
      descricao,
      data,
      categoria,
      metodoPagamento,
      comprovante,
    };

    if (tipo === 'Despesa' && fornecedorId) {
      transactionData.fornecedorId = fornecedorId;
    }

    addTransactionMutation.mutate(transactionData);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center min-h-screen p-4 z-50 font-sans">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-4 transform transition-all duration-300">
        <div className="flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Adicionar Nova Transação</h1>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="grid grid-cols-2 gap-3">
               <button type="button" onClick={() => setTipo('Receita')} className={`flex items-center justify-center p-3 rounded-lg border-2 font-semibold transition-all ${tipo === 'Receita' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 bg-white text-gray-500 hover:border-green-500'}`}>
                <span className="mr-2">&#x2191;</span> Receita
              </button>
              <button type="button" onClick={() => setTipo('Despesa')} className={`flex items-center justify-center p-3 rounded-lg border-2 font-semibold transition-all ${tipo === 'Despesa' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 bg-white text-gray-500 hover:border-red-500'}`}>
                <span className="mr-2">&#x2193;</span> Despesa
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="valor" className="block text-sm font-medium text-gray-700">Valor</label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="text-gray-500 text-lg">R$</span>
              </div>
              <input type="text" id="valor" name="valor" value={valor} onChange={handleValorChange} className="block w-full text-xl sm:text-2xl font-bold rounded-md border-gray-300 pl-12 pr-4 py-2 focus:border-blue-500 focus:ring-blue-500" placeholder="0,00" />
            </div>
          </div>

          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição</label>
            <input type="text" id="descricao" name="descricao" value={descricao} onChange={e => setDescricao(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: Venda de peça, Mão de obra..." required/>
          </div>

          <div>
             <label htmlFor="data" className="block text-sm font-medium text-gray-700 mb-1">Data</label>
             <div className="flex items-center gap-2">
                <input type="date" id="data" name="data" value={data} onChange={e => setData(e.target.value)} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                <button type="button" onClick={() => setDate(0)} className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Hoje</button>
                <button type="button" onClick={() => setDate(-1)} className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Ontem</button>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">Categoria</label>
              <select id="categoria" name="categoria" value={categoria} onChange={e => setCategoria(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                <option>Venda de Produto</option>
                <option>Prestação de Serviço</option>
                <option>Salário</option>
                <option>Compra de Material</option>
                <option>Aluguel</option>
                <option>Outra</option>
              </select>
            </div>
            <div>
                <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700">Método de Pagamento</label>
                <select id="payment-method" name="payment-method" value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    <option>PIX</option>
                    <option>Cartão de Crédito</option>
                    <option>Cartão de Débito</option>
                    <option>Dinheiro</option>
                    <option>Boleto</option>
                    <option>Transferência</option>
                </select>
            </div>
            {tipo === 'Despesa' && (
              <div className="sm:col-span-2">
                <label htmlFor="fornecedor" className="block text-sm font-medium text-gray-700">Fornecedor (Opcional)</label>
                <select 
                  id="fornecedor" 
                  name="fornecedor" 
                  value={fornecedorId} 
                  onChange={e => setFornecedorId(e.target.value)} 
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  disabled={isLoadingSuppliers}
                >
                  <option value="">Selecione um fornecedor</option>
                  {isLoadingSuppliers ? (
                    <option disabled>Carregando...</option>
                  ) : (
                    suppliers?.map(supplier => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.nomeFantasia}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Anexar Comprovante (Opcional)</label>
            <div className="mt-1 flex justify-center px-6 pt-4 pb-4 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <span className="text-xl text-gray-400">&#128206;</span>
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload-input" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>{comprovanteName ? `Arquivo: ${comprovanteName}` : 'Clique para carregar'}</span>
                    <input id="file-upload-input" name="file-upload-input" type="file" className="sr-only" ref={fileInputRef} onChange={handleFileChange} />
                  </label>
                  {comprovanteName && <button type="button" onClick={() => {setComprovante(null); setComprovanteName('');}} className="ml-2 text-red-500 hover:text-red-700">&times;</button>}
                </div>
                <p className="text-xs text-gray-500">PNG, JPG ou PDF</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-4 border-t mt-4">
            <button type="submit" disabled={addTransactionMutation.isPending} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md disabled:bg-blue-400">
              {addTransactionMutation.isPending ? 'Adicionando...' : 'Adicionar Transação'}
            </button>
            <button type="button" onClick={onClose} className="w-full sm:w-auto bg-gray-100 text-gray-700 font-bold py-2 px-5 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
