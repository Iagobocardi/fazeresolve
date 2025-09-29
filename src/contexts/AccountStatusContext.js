// src/contexts/AccountStatusContext.js
import React, { createContext, useState, useContext } from 'react';

export const AccountStatusContext = createContext(null);

export const AccountStatusProvider = ({ children }) => {
    const [status, setStatus] = useState(null); // e.g., 'ativo', 'ativo_em_carencia', 'bloqueado_pagamento'
    const [data, setData] = useState(null); // Full API response { usuario, assinatura }

    const value = {
        status,
        data,
        setStatus,
        setData,
        isGracePeriod: status === 'ativo_em_carencia',
        isBlocked: status === 'bloqueado_pagamento',
    };

    return (
        <AccountStatusContext.Provider value={value}>
            {children}
        </AccountStatusContext.Provider>
    );
};

export const useAccountStatus = () => {
    const context = useContext(AccountStatusContext);
    if (!context) {
        throw new Error('useAccountStatus must be used within an AccountStatusProvider');
    }
    return context;
};
