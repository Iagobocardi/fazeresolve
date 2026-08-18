// src/components/modals/CatalogoExternoModal.js
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button.jsx';
import { Card, CardContent } from '../ui/card.jsx';
import apiClient from '../../api/apiClient';

const X = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> );

const fetchCatalogoWilerK = async () => {
    const { data } = await apiClient.get('/externo/wiler-k/veludos');
    return data;
};

const CatalogoExternoModal = ({ isOpen, onClose }) => {
    const { data: produtos, isLoading, error } = useQuery({
        queryKey: ['catalogoWilerK'],
        queryFn: fetchCatalogoWilerK,
        enabled: isOpen, // Só executa a busca quando o modal está aberto
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100]">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-foreground">Catálogo de Veludos - Wiler-K</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-6 w-6" /></Button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2">
                    {isLoading && <p className="text-center text-muted-foreground py-8">A carregar catálogo do fornecedor...</p>}
                    {error && <p className="text-center text-destructive py-8">{error.message}</p>}

                    {produtos && (
                        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
                            {produtos.map(produto => (
                                <Card key={produto.id} className="overflow-hidden">
                                    <div className="aspect-square bg-muted">
                                        <img src={produto.imagemUrl} alt={produto.nome} className="w-full h-full object-cover" />
                                    </div>
                                    <CardContent className="p-3">
                                        <h3 className="text-sm font-semibold text-foreground truncate">{produto.nome}</h3>
                                        {/* Futuramente, podemos adicionar um botão para importar o produto para o nosso estoque */}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CatalogoExternoModal;