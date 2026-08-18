import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

// Icons for the password visibility toggle
const EyeIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const EyeOffIcon = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
);


const Subscribe = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [formData, setFormData] = useState({
        nomeEmpresa: '',
        nome: '',
        email: '',
        telefone: '',
        password: '',
    });
    const [planId, setPlanId] = useState('');
    const [paymentType, setPaymentType] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const pId = params.get('planoId');
        const pType = params.get('paymentType');

        if (!pId || !pType) {
            toast.error("Seleção de plano inválida. Redirecionando...");
            navigate('/planos');
        } else {
            setPlanId(pId);
            setPaymentType(pType);
        }
    }, [location, navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password.length < 8) {
            toast.error("A senha deve ter pelo menos 8 caracteres.");
            return;
        }
        
        // Se for um plano de pagamento único, redireciona para a escolha de pagamento
        // com os dados do formulário, em vez de registrar imediatamente.
        if (paymentType === 'onetime') {
            navigate('/escolher-pagamento', { 
                state: { 
                    planId, 
                    paymentType,
                    registrationData: formData // Passa os dados do formulário
                } 
            });
        } else {
            // Lógica original para assinaturas
            setIsLoading(true);
            const registrationData = { ...formData, planId, paymentType };
            try {
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/register`, registrationData);
                toast.success(response.data.message);
                localStorage.setItem('authToken', response.data.token);
                navigate('/pagamento-assinatura'); // Página para inserir dados do cartão da assinatura
            } catch (error) {
                const errorMessage = error.response?.data?.message || 'Erro ao registrar. Tente novamente.';
                toast.error(errorMessage);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
                <h2 className="text-3xl font-bold text-slate-900 text-center mb-2">Crie sua Conta</h2>
                <p className="text-slate-600 text-center mb-6">Plano selecionado: <strong>{planId}</strong></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="nomeEmpresa" placeholder="Nome da Empresa" onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="text" name="nome" placeholder="Seu Nome Completo" onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="email" name="email" placeholder="Seu Melhor E-mail" onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="tel" name="telefone" placeholder="Telefone (com DDD)" onChange={handleChange} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            placeholder="Crie uma Senha (mín. 8 caracteres)"
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500"
                        >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition disabled:bg-slate-400">
                        {isLoading ? 'Criando conta...' : 'Finalizar Cadastro'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Subscribe;
