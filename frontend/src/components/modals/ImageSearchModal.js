import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button.jsx';
import apiClient from '../../api/apiClient';

const ImageSearchModal = ({ productName, onClose, onImageSelect }) => {
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const searchImages = async () => {
        if (!productName) {
            toast.error("Por favor, insira um nome para o produto antes de buscar imagens.");
            return;
        }
        setIsLoading(true);
        try {
            const response = await apiClient.post('/google/search-image', { query: productName });
            setImages(response.data.items || []);
        } catch (error) {
            toast.error("Falha ao buscar imagens.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[70] p-4">
            <div className="bg-white rounded-lg p-6 w-11/12 max-w-4xl max-h-[90vh] flex flex-col">
                <h3 className="text-lg font-bold mb-4">Selecione uma Imagem para "{productName}"</h3>
                <Button onClick={searchImages} disabled={isLoading} className="mb-4">
                    {isLoading ? 'A buscar...' : 'Buscar Imagens no Google'}
                </Button>
                <div className="overflow-y-auto flex-grow">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {images.map((img, index) => (
                            <img
                                key={index}
                                src={img.link}
                                alt={img.title}
                                className="w-full h-32 object-cover rounded-md cursor-pointer hover:ring-4 ring-indigo-500"
                                onClick={() => onImageSelect(img.link)}
                            />
                        ))}
                    </div>
                </div>
                <Button onClick={onClose} className="mt-4 self-end">Fechar</Button>
            </div>
        </div>
    );
};

export default ImageSearchModal;
