import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { addPagamento } from '../../api/pedidosApi'; // Correct API function

const AddPaymentToOrderModal = ({ isOpen, onClose, pedido }) => {
  const [valor, setValor] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPagamento, setMetodoPagamento] = useState('PIX');
  
  const queryClient = useQueryClient();

  const addPaymentMutation = useMutation({
    mutationFn: (newPayment) => addPagamento({ pedidoId: pedido._id, paymentData: newPayment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', pedido._id] });
      toast.success('Pagamento adicionado com sucesso!');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Ocorreu um erro ao adicionar o pagamento.');
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
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const valorNumerico = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
    
    if (valorNumerico <= 0) {
        toast.error('O valor do pagamento deve ser maior que zero.');
        return;
    }
    
    addPaymentMutation.mutate({
      valor: valorNumerico,
      data,
      metodo: metodoPagamento,
      descricao: `Pagamento para o pedido #${pedido.shortId}`,
    });
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center min-h-screen p-4 z-50 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Adicionar Pagamento</h1>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="valor" className="block text-sm font-medium text-gray-700">Valor</label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="text-gray-500 text-lg">R$</span>
              </div>
              <input type="text" id="valor" name="valor" value={valor} onChange={handleValorChange} className="block w-full text-2xl font-bold rounded-md border-gray-300 pl-12 pr-4 py-3 focus:border-blue-500 focus:ring-blue-500" placeholder="0,00" required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="data" className="block text-sm font-medium text-gray-700">Data</label>
              <input type="date" id="data" name="data" value={data} onChange={e => setData(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="payment-method" className="block text-sm font-medium text-gray-700">Método</label>
              <select id="payment-method" name="payment-method" value={metodoPagamento} onChange={e => setMetodoPagamento(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                <option>PIX</option>
                <option>Cartão de Crédito</option>
                <option>Cartão de Débito</option>
                <option>Dinheiro</option>
                <option>Boleto</option>
                <option>Transferência</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-5 border-t mt-6">
            <button type="submit" disabled={addPaymentMutation.isPending} className="w-full sm:w-auto bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 disabled:bg-green-400">
              {addPaymentMutation.isPending ? 'Adicionando...' : 'Adicionar Pagamento'}
            </button>
            <button type="button" onClick={onClose} className="w-full sm:w-auto bg-gray-100 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentToOrderModal;
