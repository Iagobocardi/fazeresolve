import React from 'react';

const History = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" /></svg> );
const ClipboardList = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg> );
const PaperClipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const ExternalLinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;


const AbaDocumentos = ({
    pedido,
    notas, setNotas,
    saveStatus, setSaveStatus, handleSaveNotas,
    handleFotoSubmit,
    apiClient,
    fileInputRef,
    handleFileChange,
    isUploading,
    handleAttachClick
}) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-3"><History className="h-5 w-5 mr-2" />Histórico do Pedido</h3>
                    <ul className="space-y-3">
                        {pedido.historico && pedido.historico.length > 0 ? (
                            pedido.historico.slice(0).reverse().map((item, index) => (
                                <li key={index} className="text-sm text-gray-600 border-l-2 pl-3 border-gray-200">
                                    <p className="font-medium text-gray-800">{item.evento}</p>
                                    <p className="text-xs text-gray-400">{new Date(item.data).toLocaleString('pt-BR')}</p>
                                </li>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 italic">Nenhum evento registrado.</p>
                        )}
                    </ul>
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-2"><ClipboardList className="h-5 w-5 mr-2" />Notas Internas</h3>
                    <textarea className="w-full h-32 p-2 border rounded-lg" placeholder="Anote detalhes aqui..." value={notas} onChange={(e) => { setNotas(e.target.value); setSaveStatus('idle'); }} disabled={saveStatus === 'saving'}></textarea>
                    <button onClick={handleSaveNotas} disabled={saveStatus !== 'idle'} className="mt-2 w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                        {saveStatus === 'idle' ? 'Salvar Notas' : saveStatus === 'saving' ? 'Salvando...' : 'Salvo!'}
                    </button>
                </div>
            </div>
            <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Fotos do Serviço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <form onSubmit={handleFotoSubmit}>
                        <div className="space-y-2">
                            <input type="file" name="foto" required className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                            <input type="text" name="descricao" placeholder="Descrição da foto (opcional)" className="w-full p-2 border rounded-md" />
                        </div>
                        <button type="submit" className="mt-2 w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700">Enviar Foto</button>
                    </form>
                    <div className="grid grid-cols-3 gap-2">
                        {pedido.fotosServico && pedido.fotosServico.map((foto, index) => (
                            <div key={index}>
                                <a href={foto.url} target="_blank" rel="noopener noreferrer">
                                    <img src={foto.url} alt={foto.descricao} className="rounded-lg object-cover h-24 w-full" />
                                </a>
                                <p className="text-xs text-center text-gray-500 mt-1 truncate">{foto.descricao}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {pedido.status === 'Finalizado' && (
                <>
                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Documentos</h3>
                        <a href={`${apiClient.defaults.baseURL}/orcamentos/${pedido._id}/fatura-pdf`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors no-underline">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Gerar Fatura (PDF)
                        </a>
                        {pedido.statusPagamento !== 'Pago' && (<p className="text-xs text-center text-yellow-700 mt-2 bg-yellow-100 p-2 rounded-md">Atenção: O pagamento ainda está como '{pedido.statusPagamento}'.</p>)}
                    </div>
                    <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Nota Fiscal do Serviço</h3>
                        {pedido.notaFiscalUrl ? (
                            <a href={pedido.notaFiscalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 font-semibold rounded-lg hover:bg-green-200">
                                Ver Nota Fiscal <ExternalLinkIcon />
                            </a>
                        ) : (
                            <>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp, application/pdf" />
                                <button onClick={handleAttachClick} disabled={isUploading} className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50">
                                    <PaperClipIcon /> {isUploading ? 'A enviar...' : 'Anexar Nota Fiscal'}
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AbaDocumentos;
