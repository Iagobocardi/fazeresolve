import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { uploadFilePedido } from '../../api/pedidosApi';
import { Camera } from 'lucide-react';

const AddPhotoModal = ({ isOpen, onClose, pedidoId }) => {
  const [descricao, setDescricao] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadPhotoMutation = useMutation({
    mutationFn: uploadFilePedido,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      toast.success('Foto adicionada com sucesso!');
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Ocorreu um erro ao enviar a foto.');
    },
    onSettled: () => {
        // Reset form state
        setDescricao('');
        setFile(null);
        setPreview(null);
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Por favor, selecione uma foto para enviar.');
      return;
    }
    const formData = new FormData();
    formData.append('foto', file, file.name);
    formData.append('descricao', descricao);
    
    uploadPhotoMutation.mutate({ pedidoId, formData });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Adicionar Foto do Serviço</h1>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Selecione a Foto</label>
            <div 
              onClick={() => fileInputRef.current.click()}
              className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer"
            >
              <div className="space-y-1 text-center">
                {preview ? (
                  <img src={preview} alt="Pré-visualização" className="mx-auto h-32 w-auto object-cover rounded-md" />
                ) : (
                  <>
                    <Camera className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="text-sm text-gray-500">Clique para selecionar uma imagem</p>
                  </>
                )}
                <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição (Opcional)</label>
            <input
              type="text"
              id="descricao"
              name="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Antes da reforma"
            />
          </div>
          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-5 border-t mt-6">
            <button
              type="submit"
              disabled={uploadPhotoMutation.isPending}
              className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            >
              {uploadPhotoMutation.isPending ? 'Enviando...' : 'Adicionar Foto'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto bg-gray-100 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPhotoModal;
