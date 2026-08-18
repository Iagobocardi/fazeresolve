import React, { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card.jsx";
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import apiClient from '../../api/apiClient';
import ImageSearchModal from './ImageSearchModal.js';

// --- ÍCONES ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const X = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> );

const EstoqueInteligenteModal = ({ onClose }) => {
    const [invoiceImage, setInvoiceImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [extractedItems, setExtractedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [currentItemIndex, setCurrentItemIndex] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setInvoiceImage(file);
            setPreviewUrl(URL.createObjectURL(file));
            setExtractedItems([]);
        }
    };

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });

    const handleProcessInvoice = useCallback(async () => {
        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        if (!apiKey) { toast.error("A chave de API do Gemini não foi configurada."); return; }
        if (!invoiceImage) { toast.error("Por favor, selecione uma imagem da nota fiscal primeiro."); return; }

        setIsLoading(true);
        const toastId = toast.loading('A processar a nota fiscal...');

        try {
            const base64ImageData = await toBase64(invoiceImage);
            const prompt = "Analise a imagem desta nota fiscal. Identifique cada item e a sua respectiva quantidade. Retorne os dados como um array de objetos JSON, onde cada objeto contém as chaves 'produto' e 'quantidade'. Ignore impostos, totais e outras informações que não sejam itens de produto.";
            const schema = { type: "ARRAY", items: { type: "OBJECT", properties: { "produto": { "type": "STRING" }, "quantidade": { "type": "NUMBER" } }, required: ["produto", "quantidade"] } };
            const payload = { contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: invoiceImage.type, data: base64ImageData } }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema } };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ error: { message: `Erro na API: ${response.statusText}` } }));
                throw new Error(errorBody.error?.message || `A API retornou um erro: ${response.statusText}`);
            }
            
            const result = await response.json();
            toast.dismiss(toastId);
            
            if (result.candidates && result.candidates[0].content.parts[0].text) {
                const items = JSON.parse(result.candidates[0].content.parts[0].text);
                const itemsWithEditableFields = items.map(item => ({ ...item, unidade: 'Unidade', imagemUrl: '' }));
                setExtractedItems(itemsWithEditableFields);
                toast.success("Itens extraídos! Agora pode corrigir e adicionar imagens.");
            } else {
                throw new Error("A resposta da IA não continha os itens esperados.");
            }
        } catch (error) {
            toast.dismiss(toastId);
            toast.error(`Falha ao processar: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [invoiceImage]);

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...extractedItems];
        updatedItems[index][field] = value;
        setExtractedItems(updatedItems);
    };

    const handleOpenImageModal = (index) => {
        setCurrentItemIndex(index);
        setIsImageModalOpen(true);
    };

    const handleImageSelected = (imageUrl) => {
        handleItemChange(currentItemIndex, 'imagemUrl', imageUrl);
        setIsImageModalOpen(false);
    };

    const handleAddToStock = async () => {
        if (extractedItems.length === 0) return;
        const toastId = toast.loading("A adicionar itens ao estoque...");
        try {
            await apiClient.post('/estoque/add-batch', { items: extractedItems });
            toast.success("Itens adicionados ao estoque com sucesso!", { id: toastId });
            setExtractedItems([]);
            setInvoiceImage(null);
            setPreviewUrl('');
            onClose(); // Fecha o modal principal
        } catch (error) {
            toast.error(`Falha ao adicionar itens: ${error.message}`, { id: toastId });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            {isImageModalOpen && <ImageSearchModal productName={extractedItems[currentItemIndex].produto} onClose={() => setIsImageModalOpen(false)} onImageSelect={handleImageSelected} />}
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b flex-shrink-0">
                    <h2 className="text-xl font-bold">Entrada de Estoque Inteligente</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-6 w-6" /></Button>
                </header>

                <main className="p-6 space-y-6 flex-grow overflow-y-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Passo 1: Enviar Nota Fiscal</CardTitle>
                            <CardDescription>Envie uma imagem nítida da sua nota fiscal para iniciar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <label htmlFor="invoice-upload-modal" className="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-100">
                                <div className="flex flex-col items-center justify-center">
                                    <UploadIcon />
                                    <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                                    <p className="text-xs text-gray-500">{invoiceImage ? `Ficheiro: ${invoiceImage.name}` : "PNG, JPG ou WEBP"}</p>
                                </div>
                                <Input id="invoice-upload-modal" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} />
                            </label>
                            {previewUrl && (
                                <div className="mt-4">
                                    <p className="text-sm font-medium mb-2">Pré-visualização:</p>
                                    <img src={previewUrl} alt="Pré-visualização da nota fiscal" className="rounded-lg w-full max-h-[40vh] object-contain border" />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-center">
                        <Button onClick={handleProcessInvoice} disabled={isLoading || !invoiceImage}>{isLoading ? 'A processar...' : 'Ler Nota Fiscal com IA'}</Button>
                    </div>

                    {extractedItems.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Passo 2: Confirmar e Enriquecer Itens</CardTitle>
                                <CardDescription>Verifique os dados extraídos, edite se necessário e adicione imagens.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs uppercase bg-gray-50"><tr>
                                            <th className="px-4 py-3">Produto</th><th className="px-4 py-3">Qtd.</th><th className="px-4 py-3">Unidade</th><th className="px-4 py-3">Imagem</th>
                                        </tr></thead>
                                        <tbody>
                                            {extractedItems.map((item, index) => (
                                                <tr key={index} className="bg-white border-b">
                                                    <td className="px-2 py-2"><Input type="text" value={item.produto} onChange={(e) => handleItemChange(index, 'produto', e.target.value)} className="w-full" /></td>
                                                    <td className="px-2 py-2"><Input type="number" value={item.quantidade} onChange={(e) => handleItemChange(index, 'quantidade', parseFloat(e.target.value) || 0)} className="w-20" /></td>
                                                    <td className="px-2 py-2"><select value={item.unidade} onChange={(e) => handleItemChange(index, 'unidade', e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm"><option>Unidade</option><option>kg</option><option>Litro</option><option>Metro</option><option>Caixa</option><option>Peça</option></select></td>
                                                    <td className="px-2 py-2 text-center"><button type="button" onClick={() => handleOpenImageModal(index)} className="w-12 h-12 flex items-center justify-center rounded-md border hover:bg-gray-100"><img src={item.imagemUrl || 'https://placehold.co/48x48/eee/ccc?text=%2B'} alt={item.produto} className="w-full h-full object-cover rounded-md" /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </main>
                <footer className="p-4 border-t flex-shrink-0 flex justify-end">
                    <Button onClick={handleAddToStock} className="bg-green-600 hover:bg-green-700" disabled={extractedItems.length === 0}><CheckCircleIcon /> Adicionar Tudo ao Estoque</Button>
                </footer>
            </div>
        </div>
    );
};

export default EstoqueInteligenteModal;
