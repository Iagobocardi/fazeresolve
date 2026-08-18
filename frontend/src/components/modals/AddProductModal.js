import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from 'api/apiClient';
import { toast } from 'react-hot-toast';
import ImageSearchModal from './ImageSearchModal.js';

const AddProductModal = ({ show, onHide }) => {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState(0.00);
  const [unidade, setUnidade] = useState('un');
  const [quantidade, setQuantidade] = useState(0);
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagemUrl, setImagemUrl] = useState('');
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const queryClient = useQueryClient();
  const imageInputRef = useRef(null);

  const addProductMutation = useMutation({
    mutationFn: (newProduct) => {
      const { imageFile, ...productData } = newProduct;
      return apiClient.post('/produtos', productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      onHide();
      // Reset form
      setNome('');
      setPreco(0.00);
      setUnidade('un');
      setQuantidade(0);
      setImagePreview('');
      setImageFile(null);
      setImagemUrl('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Ocorreu um erro ao adicionar o produto.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const productData = {
      nome,
      custoUnitario: parseFloat(preco) || 0,
      unidade,
      quantidade: parseInt(quantidade, 10) || 0,
      imagemUrl,
      imageFile,
    };
    addProductMutation.mutate(productData);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagemUrl(''); // Clear URL if a file is selected
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImagemUrl('');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleStepper = (field, amount) => {
    if (field === 'quantidade') {
      setQuantidade(prev => Math.max(0, prev + amount));
    } else if (field === 'preco') {
      setPreco(prev => Math.max(0, parseFloat((prev + amount).toFixed(2))));
    }
  };
  
  const handleGoogleImageSelect = (url) => {
    removeImage(); // Clear any local file selection
    setImagemUrl(url);
    setImagePreview(url);
    setIsImageSearchOpen(false);
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 font-sans">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col p-8">
          <div className="flex justify-between items-center pb-5 mb-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-800">Adicionar Novo Produto</h2>
            <button onClick={onHide} className="text-gray-400 hover:text-gray-600 text-3xl font-light">&times;</button>
          </div>

          <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto pr-4 space-y-8">
            {/* Section: Informações do Produto */}
            <div className="form-section">
              <h3 className="text-base font-semibold text-gray-500 mb-4 pb-2 border-b border-gray-200">Informações do Produto</h3>
              <div className="space-y-5">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-600 mb-2">Nome</label>
                  <input type="text" id="nome" placeholder="Nome do produto" required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label htmlFor="unidade" className="block text-sm font-medium text-gray-600 mb-2">Unidade</label>
                  <select id="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none bg-white">
                    <option value="un">Unidade (un)</option>
                    <option value="kg">Quilograma (kg)</option>
                    <option value="m">Metro (m)</option>
                    <option value="lt">Litro (lt)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Estoque e Preço */}
            <div className="form-section">
              <h3 className="text-base font-semibold text-gray-500 mb-4 pb-2 border-b border-gray-200">Estoque e Preço</h3>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1">
                  <label htmlFor="quantidade" className="block text-sm font-medium text-gray-600 mb-2">Quantidade em Estoque</label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <input type="number" id="quantidade" value={quantidade} onChange={(e) => setQuantidade(parseInt(e.target.value, 10) || 0)} min="0" className="w-full p-3 border-none focus:ring-0 text-lg" />
                    <div className="flex flex-col border-l border-gray-300">
                      <button type="button" onClick={() => handleStepper('quantidade', 1)} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-lg leading-none border-b border-gray-300">+</button>
                      <button type="button" onClick={() => handleStepper('quantidade', -1)} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-lg leading-none">-</button>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor="preco" className="block text-sm font-medium text-gray-600 mb-2">Preço</label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <span className="pl-4 text-gray-500">R$</span>
                    <input type="number" id="preco" value={preco} onChange={(e) => setPreco(parseFloat(e.target.value) || 0)} min="0" step="0.01" className="w-full p-3 border-none focus:ring-0 text-lg" />
                    <div className="flex flex-col border-l border-gray-300">
                      <button type="button" onClick={() => handleStepper('preco', 1.00)} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-lg leading-none border-b border-gray-300">+</button>
                      <button type="button" onClick={() => handleStepper('preco', -1.00)} className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-lg leading-none">-</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Mídia do Produto */}
            <div className="form-section">
              <h3 className="text-base font-semibold text-gray-500 mb-4 pb-2 border-b border-gray-200">Mídia do Produto</h3>
              <div style={{ display: imagePreview ? 'block' : 'none' }} className="mt-4 text-center relative w-40 mx-auto">
                <img src={imagePreview} alt="Pré-visualização" className="w-full h-auto rounded-lg shadow-md" />
                <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg shadow-lg hover:bg-red-600">&times;</button>
              </div>
              <div style={{ display: imagePreview ? 'none' : 'block' }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div onClick={() => imageInputRef.current.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition h-full flex flex-col justify-center">
                  <span className="text-4xl text-gray-400">&#x219Up;</span>
                  <p className="mt-2 text-sm text-gray-600">Upload do Computador</p>
                  <input type="file" id="imageInput" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageChange} />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Ou</p>
                  <button type="button" onClick={() => setIsImageSearchOpen(true)} className="w-full bg-gray-200 text-gray-800 px-4 py-3 rounded-lg text-sm font-semibold hover:bg-gray-300 transition">
                    Buscar Imagem no Google
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
              <button type="button" onClick={onHide} className="px-8 py-3 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition">Cancelar</button>
              <button type="submit" disabled={addProductMutation.isPending} className="px-8 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:bg-blue-400">
                {addProductMutation.isPending ? 'Adicionando...' : 'Adicionar Produto'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {isImageSearchOpen && (
        <ImageSearchModal
          productName={nome}
          onClose={() => setIsImageSearchOpen(false)}
          onImageSelect={handleGoogleImageSelect}
        />
      )}
    </>
  );
};

export default AddProductModal;
