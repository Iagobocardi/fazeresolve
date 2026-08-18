import React, { createContext, useState, useContext } from 'react';
import { planos } from '../data/plans';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(() => {
        try {
            const storedUser = localStorage.getItem('usuario');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    });

    const [accountStatus, setAccountStatus] = useState(() => {
        return localStorage.getItem('account_status') || 'ACTIVE';
    });
    
    const [gracePeriodExpires, setGracePeriodExpires] = useState(() => {
        return localStorage.getItem('grace_period_expires');
    });

    const login = (loginResponse) => {
        const { usuario: dadosUsuario, token, account_status, payment_status_warning } = loginResponse;
        
        const usuarioComPlano = { ...dadosUsuario };

        if (usuarioComPlano.planId) {
            const planoEncontrado = planos.find(p => p.id === usuarioComPlano.planId);
            if (planoEncontrado) {
                usuarioComPlano.plano = planoEncontrado.nome;
            }
        }

        setUsuario(usuarioComPlano);
        localStorage.setItem('usuario', JSON.stringify(usuarioComPlano));
        localStorage.setItem('authToken', token);

        if (account_status === 'LOCKED') {
            setAccountStatus('LOCKED');
            localStorage.setItem('account_status', 'LOCKED');
            setGracePeriodExpires(null);
            localStorage.removeItem('grace_period_expires');
        } else if (payment_status_warning) {
            setAccountStatus('PENDING');
            localStorage.setItem('account_status', 'PENDING');
            setGracePeriodExpires(payment_status_warning.expires_at);
            localStorage.setItem('grace_period_expires', payment_status_warning.expires_at);
        } else {
            setAccountStatus('ACTIVE');
            localStorage.setItem('account_status', 'ACTIVE');
            setGracePeriodExpires(null);
            localStorage.removeItem('grace_period_expires');
        }
    };

    const clearAuth = () => {
        setUsuario(null);
        setAccountStatus('ACTIVE');
        setGracePeriodExpires(null);
        localStorage.removeItem('usuario');
        localStorage.removeItem('authToken');
        localStorage.removeItem('account_status');
        localStorage.removeItem('grace_period_expires');
    };

    const logout = () => {
        clearAuth();
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    };

    const updateUserPlan = (newPlanData) => {
        setUsuario(currentUser => {
            const updatedUser = {
                ...currentUser,
                plano: newPlanData.newPlan,
                permissions: newPlanData.permissions,
            };
            localStorage.setItem('usuario', JSON.stringify(updatedUser));
            return updatedUser;
        });
    };

    const updateAccountStatus = (status) => {
        setAccountStatus(status);
        localStorage.setItem('account_status', status);
    };

    const value = { usuario, accountStatus, gracePeriodExpires, login, logout, clearAuth, updateUserPlan, updateAccountStatus };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
