import React from 'react';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { formatCurrency } from '../../lib/utils.js';

const AbaFinanceiro = ({
    pedido,
    custosTotais,
    lucroReal,
    custosFixos,
    custosEstimados,
    saldoDevedor,
    setIsReminderModalOpen,
    isMutating,
    handleMarcarComoPago,
    marcarPagoMutation,
    mostrarCalculadora,
    setMostrarCalculadora,
    horasEstimadas,
    setHorasEstimadas,
    custoHora,
    setCustoHora,
    margemLucro,
    setMargemLucro,
    custoTerceiros,
    setCustoTerceiros,
    handleSugerirPreco,
    precoSugerido,
    novoValor,
    setNovoValor,
    novoMetodo,
    setNovoMetodo,
    novaObservacao,
    setNovaObservacao,
    handleAddPagamento,
    addPagamentoMutation,
    handleRemovePagamento
}) => {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center">
                <div className="bg-blue-50 p-4 rounded-lg"><p className="text-sm text-blue-700">Valor Total</p><p className="text-2xl font-bold text-blue-800">{formatCurrency(pedido.valorProposto)}</p></div>
                <div className="bg-red-50 p-4 rounded-lg"><p className="text-sm text-red-700">Custos Totais</p><p className="text-2xl font-bold text-red-800">{formatCurrency(custosTotais)}</p></div>
                <div className="bg-green-50 p-4 rounded-lg"><p className="text-sm text-green-700">Lucro Bruto</p><p className={`text-2xl font-bold ${lucroReal >= 0 ? 'text-green-800' : 'text-red-800'}`}>{formatCurrency(lucroReal)}</p></div>
            </div>
            <div className="border bg-gray-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Detalhamento de Custos</h4>
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Custos Fixos:</span>
                    <span className="font-medium">{formatCurrency(custosFixos)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Custos Estimados:</span>
                    <span className="font-medium">{formatCurrency(custosEstimados)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                    <span className="font-bold text-gray-800">Total de Custos:</span>
                    <span className="font-bold text-red-600">{formatCurrency(custosTotais)}</span>
                </div>
            </div>
            <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">Saldo Devedor</p>
                <p className="text-3xl font-bold text-yellow-600">{formatCurrency(saldoDevedor)}</p>
                {saldoDevedor > 0 && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsReminderModalOpen(true)}>
                        Enviar Lembrete de Pagamento
                    </Button>
                )}
            </div>
            {saldoDevedor > 0 && pedido.status === 'Finalizado' && (
                <div className="mb-6">
                    <Button onClick={handleMarcarComoPago} disabled={isMutating} className="w-full bg-green-600 hover:bg-green-700">
                        {marcarPagoMutation.isPending ? 'A liquidar...' : 'Ação Rápida: Marcar como Totalmente Pago'}
                    </Button>
                </div>
            )}
            <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Calculadora de Preço de Venda</h3>
                {!mostrarCalculadora ? (
                    <Button onClick={() => setMostrarCalculadora(true)}>
                        Calcular Preço Sugerido
                    </Button>
                ) : (
                    <div className="bg-gray-100 p-4 rounded-lg space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Horas Estimadas para o Serviço</label>
                            <Input type="number" value={horasEstimadas} onChange={(e) => setHorasEstimadas(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Seu Custo por Hora (R$)</label>
                            <Input type="number" value={custoHora} onChange={(e) => setCustoHora(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Margem de Lucro Desejada (%)</label>
                            <Input type="number" value={margemLucro} onChange={(e) => setMargemLucro(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Custos de Terceiros (R$)</label>
                            <Input type="number" value={custoTerceiros} onChange={(e) => setCustoTerceiros(e.target.value)} />
                        </div>
                        <div className="text-sm text-gray-600">
                            <p><strong>Custo Total de Materiais:</strong> {formatCurrency(custosTotais)}</p>
                            <p><i>(Baseado nos materiais adicionados na aba "Operacional")</i></p>
                        </div>
                        {precoSugerido && (
                            <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg text-center">
                                <p className="text-sm font-medium text-green-700">Preço de Venda Sugerido:</p>
                                <p className="text-2xl font-bold text-green-800">{formatCurrency(precoSugerido)}</p>
                                <p className="text-xs text-gray-600 mt-1">O campo do orçamento na aba "Geral" foi preenchido com este valor.</p>
                            </div>
                        )}
                        <div className="flex space-x-2">
                            <Button onClick={handleSugerirPreco} className="w-full">
                                Calcular e Preencher
                            </Button>
                            <Button variant="ghost" onClick={() => setMostrarCalculadora(false)}>
                                Fechar
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Histórico de Pagamentos</h4>
                {pedido.pagamentos && pedido.pagamentos.length > 0 ? (
                    <ul className="space-y-2">
                        {pedido.pagamentos.map(p => (
                            <li key={p._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg text-sm">
                                <div>
                                    <span className="font-semibold">{formatCurrency(p.valor)}</span>
                                    <span className="text-gray-600 mx-2">|</span>
                                    <span>{p.metodo}</span>
                                    {p.observacao && <span className="block text-xs text-gray-500 italic">{p.observacao}</span>}
                                </div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-xs text-gray-400">{new Date(p.data).toLocaleDateString('pt-BR')}</span>
                                    <button onClick={() => handleRemovePagamento(p._id)} className="text-red-500 hover:text-red-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500 italic text-center p-4 bg-gray-50 rounded-lg">Nenhum pagamento registado.</p>
                )}
            </div>
            <form onSubmit={handleAddPagamento} className="bg-blue-50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-gray-700">Adicionar Novo Pagamento</h4>
                <div className="flex flex-col md:flex-row gap-3">
                    <input type="number" placeholder="Valor" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} className="flex-grow p-2 border rounded-lg" step="0.01" required />
                    <select value={novoMetodo} onChange={(e) => setNovoMetodo(e.target.value)} className="p-2 border rounded-lg bg-white">
                        <option>Pix</option>
                        <option>Dinheiro</option>
                        <option>Cartão de Crédito</option>
                        <option>Cartão de Débito</option>
                        <option>Transferência</option>
                    </select>
                </div>
                <input type="text" placeholder="Observação (opcional)" value={novaObservacao} onChange={(e) => setNovaObservacao(e.target.value)} className="w-full p-2 border rounded-lg" />
                <button type="submit" disabled={addPagamentoMutation.isPending} className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                    {addPagamentoMutation.isPending ? 'A adicionar...' : 'Adicionar Pagamento'}
                </button>
            </form>
        </>
    );
};

export default AbaFinanceiro;
