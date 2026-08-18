import React, { useState, useEffect, useCallback } from 'react';
import apiClient, { apiUrl } from '../api/apiClient';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import UpdatePaymentMethodForm from '../components/UpdatePaymentMethodForm';

const Settings = () => {
  const { accountStatus, updateAccountStatus } = useAuth();
  const isLocked = accountStatus === 'LOCKED';
  const [activeTab, setActiveTab] = useState('perfil-content');
  const [settingsData, setSettingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAlterarPlanoModalOpen, setAlterarPlanoModalOpen] = useState(false);
  const [isCancelarAssinaturaModalOpen, setCancelarAssinaturaModalOpen] = useState(false);
  const [isAtualizarPagamentoModalOpen, setAtualizarPagamentoModalOpen] = useState(false);

  // State for form data
  const [perfilData, setPerfilData] = useState({
    nomeEmpresa: '',
    cnpjCpf: '',
    telefone: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
    },
  });
  const [recebimentosData, setRecebimentosData] = useState({
    metodo: 'MANUAL',
    chavePix: '',
  });

  const fetchSettingsData = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/configuracoes/all-data');
      setSettingsData(data);

      if (data.account_status === 'LOCKED') {
        updateAccountStatus('LOCKED');
      }
      
      if (data.perfil) {
        setPerfilData({
            ...data.perfil,
            endereco: data.perfil.endereco || { cep: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '' }
        });
      }
      if (data.recebimentos) {
        setRecebimentosData(data.recebimentos);
      }
    } catch (error) {
      toast.error('Falha ao carregar as configurações.');
      console.error('Falha ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [updateAccountStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const mpConnectStatus = params.get('mp_connect');

    if (tab) {
      setActiveTab(`${tab}-content`);
    }

    fetchSettingsData();

    if (mpConnectStatus) {
      if (mpConnectStatus === 'success') {
        toast.success('Sua conta Mercado Pago foi conectada com sucesso!');
        // Refetch data to show the updated connection status
        fetchSettingsData();
      } else if (mpConnectStatus === 'error') {
        toast.error('Houve um problema ao conectar sua conta. Por favor, tente novamente.');
      }

      // Clean the URL to remove the mp_connect param, preventing the toast from re-appearing on refresh
      const newUrl = `${window.location.pathname}?tab=${tab || 'recebimentos'}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [fetchSettingsData]);

  const handleTabClick = (target) => {
    setActiveTab(target);
  };

  // Handlers for Perfil form
  const handlePerfilChange = (e) => {
    const { name, value } = e.target;
    setPerfilData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleEnderecoChange = (e) => {
    const { name, value } = e.target;
    setPerfilData((prevData) => ({
      ...prevData,
      endereco: {
        ...prevData.endereco,
        [name]: value,
      },
    }));
  };
  
  const handleCepSearch = async () => {
    const cep = perfilData.endereco.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
        toast.error('CEP inválido.');
        return;
    }
    try {
        const { data } = await apiClient.get(`https://viacep.com.br/ws/${cep}/json/`);
        if (data.erro) {
            toast.error('CEP não encontrado.');
        } else {
            setPerfilData(prev => ({
                ...prev,
                endereco: {
                    ...prev.endereco,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    cidade: data.localidade,
                    estado: data.uf,
                },
            }));
        }
    } catch (error) {
        toast.error('Erro ao buscar CEP.');
    }
  };

  const handleUpdatePerfil = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put('/configuracoes/perfil', perfilData);
      toast.success('Perfil atualizado com sucesso!');
      fetchSettingsData();
    } catch (error) {
      toast.error('Falha ao atualizar o perfil.');
      console.error('Falha ao atualizar perfil:', error);
    }
  };

  // Handlers for Recebimentos form
  const handleRecebimentosChange = (e) => {
    const { name, value } = e.target;
    if (name === 'payment_method') {
      setRecebimentosData((prevData) => ({ ...prevData, metodo: value }));
    } else {
      setRecebimentosData((prevData) => ({ ...prevData, [name]: value }));
    }
  };

  const handleUpdateRecebimentos = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put('/configuracoes/recebimentos', recebimentosData);
      toast.success('Configurações de recebimento salvas!');
      fetchSettingsData();
    } catch (error) {
      toast.error('Falha ao salvar as configurações de recebimento.');
      console.error('Falha ao salvar recebimentos:', error);
    }
  };

  // Handlers for Assinatura actions
  const handleAlterarPlano = async (novoPlano) => {
    try {
        await apiClient.post('/configuracoes/assinatura/alterar-plano', { novoPlano });
        toast.success(`Plano alterado para ${novoPlano} com sucesso!`);
        setAlterarPlanoModalOpen(false);
        fetchSettingsData();
    } catch (error) {
        toast.error('Falha ao alterar o plano.');
        console.error(error);
    }
  };

  const handleCancelarAssinatura = async () => {
     try {
        await apiClient.post('/configuracoes/assinatura/cancelar');
        toast.success('Assinatura cancelada com sucesso.');
        setCancelarAssinaturaModalOpen(false);
        fetchSettingsData();
    } catch (error) {
        toast.error('Falha ao cancelar a assinatura.');
        console.error(error);
    }
  };

  // Handlers for Integrations
  const handleGoogleConnect = () => {
      const token = localStorage.getItem('authToken');
      window.location.href = `${apiUrl}/configuracoes/google/connect?token=${token}`;
  };

  const handleGoogleDisconnect = async () => {
      try {
          await apiClient.delete('/configuracoes/google/disconnect');
          toast.success('Google Calendar desconectado.');
          fetchSettingsData();
      } catch (error) {
          toast.error('Falha ao desconectar o Google Calendar.');
      }
  };


  const handleMercadoPagoConnect = () => {
    console.log("handleMercadoPagoConnect called");
    const token = localStorage.getItem('authToken');
    console.log("Token:", token);
    // Atualizado para redirecionar de volta para a página de configurações
    const redirectUrl = `${window.location.origin}/configuracoes?tab=recebimentos`;
    console.log("Redirect URL:", redirectUrl);
    const finalUrl = `${apiUrl}/configuracoes/mercadopago/connect?token=${token}&redirect_uri=${encodeURIComponent(redirectUrl)}`;
    console.log("Final URL for redirect:", finalUrl);
    window.location.href = finalUrl;
  };

  if (loading) {
    return <div className="p-8">Carregando configurações...</div>;
  }

  if (!settingsData) {
    return <div className="p-8">Não foi possível carregar as configurações.</div>;
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Configurações</h1>
          <p className="text-slate-500">Gerencie as informações da sua empresa, sua assinatura e suas integrações.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          <nav className="flex-shrink-0 md:w-1/4">
            <ul className="space-y-2">
              <li><button type="button" className={`tab-link flex items-center gap-3 p-3 rounded-lg w-full text-left ${activeTab === 'perfil-content' ? 'active' : ''}`} onClick={() => handleTabClick('perfil-content')}><i className="fas fa-user-circle w-5"></i> Perfil</button></li>
              <li><button type="button" className={`tab-link flex items-center gap-3 p-3 rounded-lg w-full text-left ${activeTab === 'assinatura-content' ? 'active' : ''}`} onClick={() => handleTabClick('assinatura-content')}><i className="fas fa-credit-card w-5"></i> Plano e Assinatura</button></li>
              <li><button type="button" className={`tab-link flex items-center gap-3 p-3 rounded-lg w-full text-left ${activeTab === 'recebimentos-content' ? 'active' : ''}`} onClick={() => handleTabClick('recebimentos-content')}><i className="fas fa-hand-holding-dollar w-5"></i> Recebimentos</button></li>
              <li><button type="button" className={`tab-link flex items-center gap-3 p-3 rounded-lg w-full text-left ${activeTab === 'integracoes-content' ? 'active' : ''}`} onClick={() => handleTabClick('integracoes-content')}><i className="fas fa-plug w-5"></i> Integrações</button></li>
              <li><button type="button" className={`tab-link flex items-center gap-3 p-3 rounded-lg w-full text-left ${activeTab === 'suporte-content' ? 'active' : ''}`} onClick={() => handleTabClick('suporte-content')}><i className="fas fa-life-ring w-5"></i> Suporte</button></li>
            </ul>
          </nav>

          <div className="flex-1">
            {activeTab === 'perfil-content' && (
              <div id="perfil-content" className="tab-content space-y-8">
                <form id="perfil-form" onSubmit={handleUpdatePerfil}>
                  <div className="bg-white p-6 rounded-lg border border-slate-200">
                    <h2 className="text-xl font-bold mb-4">Informações Principais</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-slate-600 mb-1">Nome da Empresa</label><input type="text" name="nomeEmpresa" value={perfilData.nomeEmpresa || ''} onChange={handlePerfilChange} className="w-full border-slate-300 rounded-md" disabled={isLocked} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1">CNPJ ou CPF</label><input type="text" name="cnpjCpf" value={perfilData.cnpjCpf || ''} onChange={handlePerfilChange} className="w-full border-slate-300 rounded-md" disabled={isLocked} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1">Telefone</label><input type="text" name="telefone" value={perfilData.telefone || ''} onChange={handlePerfilChange} className="w-full border-slate-300 rounded-md" disabled={isLocked} /></div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-lg border border-slate-200 mt-8">
                    <h2 className="text-xl font-bold mb-4">Endereço</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-slate-600 mb-1">CEP</label>
                            <div className="flex items-center gap-2">
                                <input type="text" name="cep" value={perfilData.endereco.cep || ''} onChange={handleEnderecoChange} className="w-full border-slate-300 rounded-md" disabled={isLocked} />
                                <button type="button" onClick={handleCepSearch} className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-200" disabled={isLocked}>Buscar</button>
                            </div>
                        </div>
                      <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-600 mb-1">Logradouro</label><input type="text" name="logradouro" value={perfilData.endereco.logradouro || ''} onChange={handleEnderecoChange} className="w-full border-slate-300 rounded-md" disabled={isLocked} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1">Número</label><input type="text" name="numero" value={perfilData.endereco.numero || ''} onChange={handleEnderecoChange} className="w-full border-slate-300 rounded-md" disabled={isLocked} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1">Bairro</label><input type="text" name="bairro" value={perfilData.endereco.bairro || ''} onChange={handleEnderecoChange} className="w-full border-slate-300 rounded-md" disabled={isLocked} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1">Cidade</label><input type="text" name="cidade" value={perfilData.endereco.cidade || ''} onChange={handleEnderecoChange} className="w-full border-slate-300 rounded-md" disabled={isLocked} /></div>
                      <div><label className="block text-sm font-medium text-slate-600 mb-1">Estado</label><input type="text" name="estado" value={perfilData.endereco.estado || ''} onChange={handleEnderecoChange} className="w-full border-slate-300 rounded-md" disabled={isLocked} /></div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-8"><button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLocked}>Salvar Alterações</button></div>
                </form>
              </div>
            )}

            {activeTab === 'assinatura-content' && (
              <div id="assinatura-content" className="tab-content space-y-8">
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                    <h2 className="text-xl font-bold mb-4">Seu Plano Atual</h2>
                    <div className="flex flex-col md:flex-row justify-between items-start bg-slate-50 p-6 rounded-lg border">
                        <div>
                            <h3 className="text-lg font-bold">{settingsData.assinatura.planoAtual}</h3>
                            <p className="text-2xl font-bold mt-1">
                              R$ {settingsData.assinatura.planosDisponiveis.find(p => p.nome === settingsData.assinatura.planoAtual)?.precoMensal || '--'}
                              <span className="text-base font-medium text-slate-500">/mês</span>
                            </p>
                            <p className="text-sm text-slate-500 mt-2">Sua próxima cobrança será em <span className="font-semibold">{new Date(settingsData.assinatura.proximaCobranca).toLocaleDateString('pt-BR')}</span>.</p>
                        </div>
                        <div><span className={`text-sm font-medium px-3 py-1 rounded-full ${settingsData.assinatura.status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{settingsData.assinatura.status}</span></div>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-4">
                        <button onClick={() => setAlterarPlanoModalOpen(true)} className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLocked}>Alterar Plano</button>
                        <button onClick={() => setCancelarAssinaturaModalOpen(true)} className="bg-slate-100 text-slate-700 font-semibold px-5 py-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLocked}>Cancelar Assinatura</button>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-slate-200">
                    <h2 className="text-xl font-bold mb-4">Método de Pagamento</h2>
                    <div className="flex items-center gap-4">
                        {settingsData.assinatura.metodoPagamento ? (
                            <>
                                <i className={`fab fa-cc-${settingsData.assinatura.metodoPagamento.brand || 'visa'} text-4xl text-blue-800`}></i>
                                <div>
                                    <p className="font-semibold">Cartão de Crédito final {settingsData.assinatura.metodoPagamento.last4}</p>
                                    {settingsData.assinatura.metodoPagamento.exp_month && settingsData.assinatura.metodoPagamento.exp_year ? (
                                      <p className="text-sm text-slate-500">
                                        Expira em {String(settingsData.assinatura.metodoPagamento.exp_month).padStart(2, '0')}/{settingsData.assinatura.metodoPagamento.exp_year}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-slate-500">Validade não informada</p>
                                    )}
                                </div>
                                <button onClick={() => setAtualizarPagamentoModalOpen(true)} className="ml-auto bg-slate-100 text-slate-700 font-semibold px-5 py-2 rounded-lg hover:bg-slate-200 text-sm">Atualizar</button>
                            </>
                        ) : (
                            <p className="text-slate-500">Nenhum método de pagamento configurado.</p>
                        )}
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg border border-slate-200">
                    <h2 className="text-xl font-bold mb-4">Histórico de Faturas</h2>
                    <table className="w-full text-left">
                        <thead className="text-sm text-slate-500"><tr><th className="p-2">Data</th><th className="p-2">Valor</th><th className="p-2">Status</th><th className="p-2"></th></tr></thead>
                        <tbody>
                            {settingsData.assinatura.faturas.map(fatura => (
                                <tr key={fatura._id} className="border-t">
                                    <td className="p-2">{new Date(fatura.createdAt).toLocaleDateString('pt-BR')}</td>
                                    <td className="p-2">R$ {fatura.valor.toFixed(2)}</td>
                                    <td className="p-2"><span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">{fatura.status}</span></td>
                                    <td className="p-2 text-right"><button type="button" className="text-blue-600 font-semibold text-sm">Ver fatura</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>
            )}

            {activeTab === 'recebimentos-content' && (
              <div id="recebimentos-content" className="tab-content">
               <form id="recebimentos-form" onSubmit={handleUpdateRecebimentos}>
                    <div className="bg-white p-6 rounded-lg border border-slate-200">
                        <h2 className="text-xl font-bold mb-4">Configurações de Recebimento</h2>
                        <p className="text-slate-600 mb-4">Escolha como você deseja receber os pagamentos dos seus clientes.</p>
                        <div className="space-y-4">
                            <label className="block p-4 border rounded-lg has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 cursor-pointer">
                                <div className="flex items-center">
                                    <input type="radio" name="payment_method" value="MANUAL" checked={recebimentosData.metodo === 'MANUAL'} onChange={handleRecebimentosChange} className="mr-3 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500" disabled={isLocked} />
                                    <span className="font-semibold">PIX Manual ou Outro Método</span>
                                </div>
                                <div className="mt-4 pl-7 text-sm text-slate-500">
                                    <label className="block font-medium text-slate-600 mb-1">Sua Chave PIX (opcional)</label>
                                    <input type="text" name="chavePix" value={recebimentosData.chavePix || ''} onChange={handleRecebimentosChange} className="w-full border-slate-300 rounded-md" placeholder="Ex: email@dominio.com ou (11) 9999-9999" disabled={isLocked} />
                                    <p className="mt-1 text-xs">Esta chave PIX será exibida ao seu cliente para facilitar o pagamento.</p>
                                </div>
                            </label>
                            <label className="block p-4 border rounded-lg has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 cursor-pointer">
                                <div className="flex items-center">
                                    <input type="radio" name="payment_method" value="MERCADOPAGO" checked={recebimentosData.metodo === 'MERCADOPAGO'} onChange={handleRecebimentosChange} className="mr-3 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500" disabled={isLocked} />
                                    <span className="font-semibold">Mercado Pago (Integrado)</span>
                                </div>
                                <div className="mt-2 pl-7 text-sm text-slate-500 space-y-2">
                                    <p>Permita que seus clientes paguem com Cartão de Crédito diretamente pelo portal.</p>
                                    {recebimentosData.metodo === 'MERCADOPAGO' && (
                                        settingsData.integracoes.mercadoPago.conectado ? (
                                            <div className="flex items-center gap-2 text-green-600 font-semibold">
                                                <i className="fas fa-check-circle"></i>
                                                <span>Conectado com sucesso.</span>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={handleMercadoPagoConnect} className="bg-blue-500 text-white font-semibold px-4 py-1.5 rounded-lg hover:bg-blue-600 text-xs disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLocked}>
                                                Conectar com Mercado Pago
                                            </button>
                                        )
                                    )}
                                </div>
                            </label>
                        </div>
                        <div className="flex justify-end mt-6"><button type="submit" className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLocked}>Salvar Configurações</button></div>
                    </div>
               </form>
              </div>
            )}

            {activeTab === 'integracoes-content' && (
              <div id="integracoes-content" className="tab-content">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* WhatsApp */}
                  <div className="bg-white p-6 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <i className="fab fa-whatsapp text-3xl text-green-500"></i>
                        <div>
                          <h3 className="font-bold text-lg">WhatsApp</h3>
                          <p className="text-sm font-semibold text-slate-500">
                            Em breve
                          </p>
                        </div>
                      </div>
                      <button className="bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-lg" disabled>
                        Conectar
                      </button>
                    </div>
                  </div>
                  {/* Google */}
                  <div className="bg-white p-6 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <i className="fab fa-google text-3xl text-blue-600"></i>
                        <div>
                          <h3 className="font-bold text-lg">Google Calendar</h3>
                          <p className={`text-sm font-semibold ${settingsData.integracoes.google.conectado ? 'text-green-600' : 'text-slate-500'}`}>
                            {settingsData.integracoes.google.conectado ? `Conectado como ${settingsData.integracoes.google.email}` : 'Não conectado'}
                          </p>
                        </div>
                      </div>
                      <button onClick={settingsData.integracoes.google.conectado ? handleGoogleDisconnect : handleGoogleConnect} className="bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLocked}>
                        {settingsData.integracoes.google.conectado ? 'Desconectar' : 'Conectar'}
                      </button>
                    </div>
                  </div>
                  {/* Focus NFe */}
                  <div className="bg-white p-6 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-2xl text-slate-700">NFe</span>
                        <div>
                          <h3 className="font-bold text-lg">Focus NFe</h3>
                          <p className="text-sm font-semibold text-slate-500">Em breve</p>
                        </div>
                      </div>
                      <button className="bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-lg hover:bg-slate-200" disabled>
                        Conectar
                      </button>
                    </div>
                  </div>
                  {/* Mercado Pago */}
                  <div className="bg-white p-6 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <i className="fas fa-hand-holding-usd text-3xl text-cyan-500"></i>
                        <div>
                          <h3 className="font-bold text-lg">Mercado Pago</h3>
                          <p className={`text-sm font-semibold ${settingsData.integracoes.mercadoPago.conectado ? 'text-green-600' : 'text-slate-500'}`}>
                            {settingsData.integracoes.mercadoPago.conectado ? 'Conectado' : 'Não conectado'}
                          </p>
                        </div>
                      </div>
                      <button onClick={handleMercadoPagoConnect} className="bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLocked}>
                        {settingsData.integracoes.mercadoPago.conectado ? 'Gerenciar' : 'Conectar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'suporte-content' && (
              <div id="suporte-content" className="tab-content">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white p-6 rounded-lg border border-slate-200 flex flex-col items-center text-center">
                       <i className="fab fa-whatsapp text-4xl text-green-500 mb-3"></i>
                       <h3 className="text-lg font-bold">Suporte via WhatsApp</h3>
                       <p className="text-sm text-slate-600 my-2 flex-grow">Fale com nossa equipe em tempo real para resolver dúvidas urgentes.</p>
                       <a href="https://wa.me/5515991499708" target="_blank" rel="noopener noreferrer" className="mt-auto w-full bg-green-500 text-white font-semibold py-2 rounded-lg hover:bg-green-600 text-center">Iniciar Conversa</a>
                   </div>
                   <div className="bg-white p-6 rounded-lg border border-slate-200 flex flex-col items-center text-center">
                       <i className="fas fa-envelope text-4xl text-blue-500 mb-3"></i>
                       <h3 className="text-lg font-bold">Suporte via E-mail</h3>
                       <p className="text-sm text-slate-600 my-2 flex-grow">Prefere enviar um e-mail? Nossa equipe responderá em até 24h.</p>
                       <a href="mailto:suporte@fazeresolve.com" className="mt-auto w-full bg-blue-500 text-white font-semibold py-2 rounded-lg hover:bg-blue-600 text-center">Enviar E-mail</a>
                   </div>
                    <div className="bg-white p-6 rounded-lg border border-slate-200 flex flex-col items-center text-center md:col-span-2">
                       <i className="fas fa-book-open text-4xl text-indigo-500 mb-3"></i>
                       <h3 className="text-lg font-bold">Central de Ajuda</h3>
                       <p className="text-sm text-slate-600 my-2 flex-grow">Acesse nossos tutoriais em vídeo e artigos para aprender a usar todas as funcionalidades.</p>
                       <a href="https://ajuda.fazeresolve.com" target="_blank" rel="noopener noreferrer" className="mt-auto w-full bg-indigo-500 text-white font-semibold py-2 rounded-lg hover:bg-indigo-600 text-center">Acessar Tutoriais</a>
                   </div>
               </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {isAlterarPlanoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 m-4">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Alterar seu plano</h2>
                  <button onClick={() => setAlterarPlanoModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl">&times;</button>
              </div>
              <p className="text-slate-600 mb-6">Você está no plano <strong>{settingsData.assinatura.planoAtual}</strong>. Escolha um novo plano abaixo:</p>
              <div className="space-y-4">
                  {settingsData.assinatura.planosDisponiveis
                      .filter(p => p.nome !== settingsData.assinatura.planoAtual)
                      .map(p => {
                          const currentPlan = settingsData.assinatura.planosDisponiveis.find(cp => cp.nome === settingsData.assinatura.planoAtual);
                          const isUpgrade = parseFloat(p.precoMensal) > parseFloat(currentPlan.precoMensal);
                          return (
                          <div key={p.nome} className="p-4 border rounded-lg flex justify-between items-center">
                              <div><h3 className="font-bold">Plano {p.nome}</h3><p>R$ {p.precoMensal}/mês</p></div>
                              <button onClick={() => handleAlterarPlano(p.nome)} className={`${isUpgrade ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'} font-semibold px-4 py-2 rounded-lg`}>
                                {isUpgrade ? 'Upgrade' : 'Downgrade'}
                              </button>
                          </div>
                      )})
                  }
              </div>
          </div>
        </div>
      )}

      {isCancelarAssinaturaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4 text-center">
                <i className="fas fa-exclamation-triangle text-4xl text-amber-500 mb-4"></i>
                <h2 className="text-2xl font-bold">Tem certeza?</h2>
                <p className="text-slate-600 my-4">Você tem certeza que deseja cancelar sua assinatura? Você perderá o acesso aos recursos do seu plano no final do seu ciclo de faturamento.</p>
                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={() => setCancelarAssinaturaModalOpen(false)} className="bg-slate-100 text-slate-700 font-semibold px-6 py-2 rounded-lg hover:bg-slate-200">Voltar</button>
                    <button onClick={handleCancelarAssinatura} className="bg-red-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-red-700">Sim, cancelar</button>
                </div>
            </div>
        </div>
      )}

      {isAtualizarPagamentoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Atualizar método de pagamento</h2>
                    <button onClick={() => setAtualizarPagamentoModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl">&times;</button>
                </div>
                <p className="text-sm text-slate-600 mb-4">Por segurança, insira novamente os dados do seu cartão. Esta ação irá atualizar o cartão para futuras cobranças da sua assinatura.</p>
                <UpdatePaymentMethodForm 
                  onFinished={() => {
                    setAtualizarPagamentoModalOpen(false);
                    fetchSettingsData();
                  }}
                  onCancel={() => setAtualizarPagamentoModalOpen(false)}
                />
            </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
