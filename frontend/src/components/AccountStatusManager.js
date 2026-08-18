// src/components/AccountStatusManager.js
import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { useAccountStatus } from '../contexts/AccountStatusContext';

const fetchAccountStatus = async () => {
    const { data } = await apiClient.get('/subscriptions/minha-conta');
    return data;
};

const AccountStatusManager = () => {
    const navigate = useNavigate();
    const { usuario } = useContext(AuthContext);
    const { setStatus, setData } = useAccountStatus();
    const queryClient = useQueryClient();

    const token = localStorage.getItem('authToken');
    const isAuthenticated = !!usuario && !!token;

    const { data: accountData, isError, isSuccess } = useQuery({
        queryKey: ['accountStatus'],
        queryFn: fetchAccountStatus,
        enabled: isAuthenticated,
        refetchOnWindowFocus: true,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    useEffect(() => {
        // Defines paths from which an active, authenticated user should be redirected away.
        // We exclude '/planos' and '/subscribe' to allow logged-in users to view them
        // without being forced back to the dashboard, preventing redirect loops.
        const redirectPathsForActiveUser = ['/login', '/forgot-password', '/reset-password'];
        const currentPath = window.location.pathname;

        if (!isAuthenticated) {
            setStatus(null);
            setData(null);
            queryClient.removeQueries({ queryKey: ['accountStatus'] });
            return;
        }

        if (isError) {
            console.error("Failed to fetch account status.");
            return;
        }

        // This is the critical fix: All redirect logic must be inside this block
        // to prevent race conditions with stale data from localStorage at startup.
        if (isSuccess && accountData) {
            const userStatus = accountData.usuario?.status;
            setStatus(userStatus);
            setData(accountData);

            if (userStatus === 'bloqueado_pagamento') {
                if (window.location.pathname !== '/acesso-bloqueado' && window.location.pathname !== '/regularizar-pagamento') {
                    navigate('/acesso-bloqueado');
                }
            } else if (userStatus === 'ativo' && redirectPathsForActiveUser.includes(currentPath)) {
                // This logic is now correctly placed. It will only run after the API
                // has confirmed the user is 'ativo', preventing the flicker redirect.
                navigate('/');
            }
        }
    }, [isAuthenticated, accountData, isError, isSuccess, navigate, setStatus, setData, queryClient]);

    return null;
};

export default AccountStatusManager;
