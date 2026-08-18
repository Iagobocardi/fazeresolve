import React, { useState } from 'react';
import Modal from 'react-modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import apiClient from '../../api/apiClient';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '2rem',
        border: 'none',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    overlay: {
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
};

Modal.setAppElement('#root');

const WhatsappOnboardingModal = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [onboardingStep, setOnboardingStep] = useState('initial'); // 'initial', 'pending_verification'
    const [twilioData, setTwilioData] = useState({
        twilioAccountSid: '',
        twilioAuthToken: '',
        numero: '',
        nomeExibicao: ''
    });
    const [verificationCode, setVerificationCode] = useState('');

    const handleTwilioDataChange = (e) => {
        const { id, value } = e.target;
        setTwilioData(prev => ({ ...prev, [id]: value }));
    };

    const iniciarOnboardingMutation = useMutation({
        mutationFn: (data) => apiClient.post('/configuracoes/whatsapp/iniciar-onboarding', data),
        onSuccess: (data) => {
            toast.success(data.data.message || 'Processo de registo do número iniciado.');
            setOnboardingStep('pending_verification');
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Falha ao iniciar o processo de onboarding.');
        },
    });

    const handleIniciarOnboarding = () => {
        if (!twilioData.twilioAccountSid || !twilioData.twilioAuthToken || !twilioData.numero || !twilioData.nomeExibicao) {
            toast.error('Por favor, preencha todos os campos da Twilio.');
            return;
        }
        iniciarOnboardingMutation.mutate(twilioData);
    };

    const verificarCodigoMutation = useMutation({
        mutationFn: (data) => apiClient.post('/configuracoes/whatsapp/verificar-sender', data),
        onSuccess: (data) => {
            toast.success(data.data.message || 'Número verificado e ativado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['configuracao'] });
            onClose(); // Fecha o modal em caso de sucesso
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Código de verificação inválido.');
        },
    });

    const handleVerificarCodigo = () => {
        if (!verificationCode) {
            toast.error('Por favor, insira o código de verificação.');
            return;
        }
        verificarCodigoMutation.mutate({ verificationCode });
    };

    const isLoading = iniciarOnboardingMutation.isPending || verificarCodigoMutation.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={() => !isLoading && onClose()}
            style={customStyles}
            contentLabel="Configurar Automação Completa do WhatsApp"
        >
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Automação Completa do WhatsApp</h2>
                <button onClick={onClose} disabled={isLoading} className="text-gray-500 hover:text-gray-700 text-2xl leading-none disabled:opacity-50">&times;</button>
            </div>

            <div className="space-y-4">
                {onboardingStep === 'initial' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 mb-4">Para ativar o envio automático de mensagens 24/7, precisamos das suas credenciais da Twilio.</p>
                        <ul className="text-xs space-y-1 list-disc list-inside mb-4 bg-gray-50 p-4 rounded-md">
                            <li>Requer verificação da sua empresa pelo Facebook.</li>
                            <li>Máxima eficiência e profissionalismo.</li>
                            <li>Recomendado para o Plano Premium.</li>
                        </ul>
                        <div className="space-y-1">
                            <label htmlFor="twilioAccountSid" className="text-sm font-medium">Twilio Account SID</label>
                            <Input id="twilioAccountSid" value={twilioData.twilioAccountSid} onChange={handleTwilioDataChange} disabled={isLoading} />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="twilioAuthToken" className="text-sm font-medium">Twilio Auth Token</label>
                            <Input id="twilioAuthToken" type="password" value={twilioData.twilioAuthToken} onChange={handleTwilioDataChange} disabled={isLoading} />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="numero" className="text-sm font-medium">Número de WhatsApp</label>
                            <Input id="numero" placeholder="+5511999998888" value={twilioData.numero} onChange={handleTwilioDataChange} disabled={isLoading} />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="nomeExibicao" className="text-sm font-medium">Nome de Exibição</label>
                            <Input id="nomeExibicao" value={twilioData.nomeExibicao} onChange={handleTwilioDataChange} disabled={isLoading} />
                        </div>
                        <div className="flex justify-end pt-4 border-t">
                            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="mr-2">Cancelar</Button>
                            <Button className="w-full" onClick={handleIniciarOnboarding} disabled={isLoading}>
                                {isLoading ? 'A iniciar...' : 'Iniciar Conexão'}
                            </Button>
                        </div>
                    </div>
                )}

                {onboardingStep === 'pending_verification' && (
                    <div className="space-y-4">
                        <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-md">
                            Processo de registo do número iniciado. Um código de verificação foi enviado para o seu número via WhatsApp.
                        </p>
                        <div className="space-y-1">
                            <label htmlFor="verificationCode" className="text-sm font-medium">Código de Verificação</label>
                            <Input id="verificationCode" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} disabled={isLoading} />
                        </div>
                         <div className="flex justify-end pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setOnboardingStep('initial')} disabled={isLoading} className="mr-2">Voltar</Button>
                            <Button className="w-full" onClick={handleVerificarCodigo} disabled={isLoading}>
                                {isLoading ? 'A verificar...' : 'Verificar e Ativar'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default WhatsappOnboardingModal;
