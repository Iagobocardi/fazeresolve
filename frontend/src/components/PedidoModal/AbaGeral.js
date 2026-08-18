import React from 'react';
import DetalhesCliente from './DetalhesCliente.js';
import { Input } from '../ui/Input.jsx';
import { Button } from '../ui/Button.jsx';

const WhatsAppIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.919 6.066l-1.225 4.485 4.625-1.212z" /></svg>;

const AbaGeral = ({
    pedido,
    categoria, setCategoria, handleCategoriaBlur, categories,
    valorProposto, setValorProposto,
    handleSubmitOrcamento, submitOrcamentoMutation,
    handleSendWhatsAppMessage
}) => {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <DetalhesCliente cliente={pedido.cliente} />
                <div>
                    <h3 className="font-semibold text-gray-700">Data da Solicitação</h3>
                    <p>{new Date(pedido.data).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                    <label htmlFor="categoria-modal" className="font-semibold text-gray-700">Categoria</label>
                    <Input
                        id="categoria-modal"
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        onBlur={handleCategoriaBlur}
                        list="categorias-list-modal"
                        placeholder="Ex: Reforma de Sofá"
                    />
                    <datalist id="categorias-list-modal">
                        {categories?.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                </div>
            </div>
            <div className="mt-4">
                <h3 className="font-semibold text-gray-700">Descrição do Serviço</h3>
                <p className="mt-1 text-gray-600 whitespace-pre-wrap">{pedido.descricao}</p>
            </div>
            {pedido.status === 'Pendente' && (
                <form onSubmit={handleSubmitOrcamento} className="bg-gray-100 p-4 rounded-lg space-y-3 mt-6">
                    <h4 className="font-semibold text-gray-700">Enviar Orçamento para o Cliente</h4>
                    <div className="flex items-center gap-3">
                        <input type="number" placeholder="Valor do Orçamento (R$)" value={valorProposto} onChange={(e) => setValorProposto(e.target.value)} className="flex-grow p-2 border rounded-lg" step="0.01" required />
                        <Button type="button" onClick={() => handleSendWhatsAppMessage('orcamento')} className="bg-green-500 hover:bg-green-600 flex-shrink-0">
                            <WhatsAppIcon /> Enviar
                        </Button>
                    </div>
                    <Button type="submit" disabled={submitOrcamentoMutation.isPending} className="w-full">
                        {submitOrcamentoMutation.isPending ? 'A salvar...' : 'Salvar Orçamento e Mover para Aceito'}
                    </Button>
                </form>
            )}
            {pedido.media && pedido.media.length > 0 && (
                <div className="mt-6">
                    <h3 className="font-semibold text-gray-700">Mídia Enviada</h3>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                        {pedido.media.map((m) => (
                            <a key={m.sid || m.url} href={m.url} target="_blank" rel="noopener noreferrer">
                                <img src={m.url} alt="Mídia do cliente" className="rounded-lg object-cover h-32 w-full" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

export default AbaGeral;
