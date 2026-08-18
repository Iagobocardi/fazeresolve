import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from 'api/apiClient';
import ImageSearchModal from './ImageSearchModal.js';

const EditProductModal = ({ show, onHide, product, onDelete }) => {
  // Form State
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState(0);
  const [unidade, setUnidade] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  
  // Image State
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');

  // Modal State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isGoogleSearchOpen, setIsGoogleSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  
  const queryClient = useQueryClient();
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (product) {
      setNome(product.nome || '');
      setPreco(product.custoUnitario || 0);
      setUnidade(product.unidade || '');
      setCategoria(product.categoria || 'Serviços');
      setDescricao(product.descricao || '');
      const initialImageUrl = product.imagemUrl || '';
      setImagePreview(initialImageUrl);
      setImageUrl(initialImageUrl);
      setImageFile(null);
    }
  }, [product]);

  const editProductMutation = useMutation({
    mutationFn: (updatedProduct) => {
      // TODO: Handle actual file upload if imageFile is present
      const { imageFile, ...payload } = updatedProduct;
      return apiClient.put(`/produtos/${product._id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto atualizado com sucesso!');
      onHide();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Ocorreu um erro ao editar o produto.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedData = { 
      nome, 
      custoUnitario: preco, 
      unidade, 
      categoria, 
      descricao, 
      imagemUrl: imageUrl,
      imageFile // For future upload logic
    };
    editProductMutation.mutate(updatedData);
  };
  
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImageUrl(''); // Clear URL from Google Search
      setImagePreview(URL.createObjectURL(file));
      setIsImageModalOpen(false); // Close nested modal on selection
    }
  };
  
  const handleGoogleImageSelect = (url) => {
    setImageFile(null); // Clear local file
    setImageUrl(url);
    setImagePreview(url);
    setIsGoogleSearchOpen(false);
    setIsImageModalOpen(false); // Close nested modal on selection
  };

  const removeImage = () => {
    setImagePreview('');
    setImageUrl('');
    setImageFile(null);
  };

  if (!show) return null;

  // Main Modal Structure
  return (
    <>
      <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex justify-center items-center z-50 p-4 font-sans">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Editar Produto</h1>
              <p className="text-gray-500">Atualize as informações do produto <span className="font-semibold">{product?.nome}</span></p>
            </div>
            <button onClick={onHide} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>

          {/* Main Content */}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Left Side: Image */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Imagem do Produto</label>
              <div className="w-full h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 relative group">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Pré-visualização" className="w-full h-full object-cover rounded-lg" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      &times;
                    </button>
                  </>
                ) : (
                  <div className="text-center text-gray-400">
                    <span className="text-4xl">&#128247;</span>
                    <p className="mt-2 text-sm">Nenhuma imagem selecionada</p>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setIsImageModalOpen(true)} className="w-full bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-all">
                Adicionar / Alterar Imagem
              </button>
            </div>

            {/* Right Side: Details */}
            <div className="space-y-4">
               <div>
                <label htmlFor="product-name" className="block text-sm font-medium text-gray-700">Nome</label>
                <input type="text" id="product-name" value={nome} onChange={e => setNome(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="product-price" className="block text-sm font-medium text-gray-700">Preço</label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500">R$</span>
                    </div>
                    <input type="number" id="product-price" value={preco} onChange={e => setPreco(parseFloat(e.target.value) || 0)} className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label htmlFor="product-unit" className="block text-sm font-medium text-gray-700">Unidade</label>
                  <input type="text" id="product-unit" value={unidade} onChange={e => setUnidade(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label htmlFor="product-category" className="block text-sm font-medium text-gray-700">Categoria</label>
                <select id="product-category" value={categoria} onChange={e => setCategoria(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  <option>Peças</option>
                  <option>Serviços</option>
                  <option>Ferramentas</option>
                  <option>Outros</option>
                </select>
              </div>
              <div>
                <label htmlFor="product-description" className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea id="product-description" rows="3" value={descricao} onChange={e => setDescricao(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: Utilizado para reparos de tela..."></textarea>
              </div>
            </div>
            
            {/* Actions */}
            <div className="md:col-span-2 flex flex-col sm:flex-row justify-between items-center pt-6 border-t">
              <button type="button" onClick={onDelete} className="text-red-600 hover:text-red-800 font-semibold transition-all">
                Excluir Produto
              </button>
              <div className="flex gap-3 mt-4 sm:mt-0">
                <button type="button" onClick={onHide} className="bg-gray-100 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-200">
                  Cancelar
                </button>
                <button type="submit" disabled={editProductMutation.isPending} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 shadow-md disabled:bg-blue-300">
                  {editProductMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Nested Image Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative">
            <button onClick={() => setIsImageModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            <h3 className="text-lg font-semibold mb-4">Escolha uma imagem</h3>
            
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-6">
                <button onClick={() => setActiveTab('upload')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'upload' ? 'border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  Carregar do Dispositivo
                </button>
                <button onClick={() => { setActiveTab('google'); setIsGoogleSearchOpen(true); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'google' ? 'border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                  Buscar no Google
                </button>
              </nav>
            </div>

            {activeTab === 'upload' && (
              <div onClick={() => imageInputRef.current && imageInputRef.current.click()} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                      <span>Carregue um ficheiro</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" ref={imageInputRef} onChange={handleImageFileChange} />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF até 10MB</p>
                </div>
              </div>
            )}

            {isGoogleSearchOpen && activeTab === 'google' && (
              <ImageSearchModal
                productName={nome}
                onClose={() => setIsGoogleSearchOpen(false)}
                onImageSelect={handleGoogleImageSelect}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EditProductModal;
