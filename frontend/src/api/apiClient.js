// Em: src/api/apiClient.js

import axios from 'axios';

// Define a variável da URL da API com base no ambiente
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
    baseURL: apiUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// O interceptor para incluir o token em todas as requisições
apiClient.interceptors.request.use(
    (config) => {
        // Se um header de autorização já estiver definido, não o substitua.
        // Isso permite que chamadas específicas (como a de subscrição com token provisório) funcionem.
        if (config.headers.Authorization) {
            return config;
        }

        const token = localStorage.getItem('authToken'); 
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor de resposta para lidar com erros de autenticação
apiClient.interceptors.response.use(
  (response) => response, // Passa as respostas de sucesso
  (error) => {
    // Apenas limpa a sessão e desloga o usuário em caso de erro 401 (Não Autorizado)
    if (error.response && error.response.status === 401) {
      // Limpa os dados de autenticação do localStorage se um token inválido for encontrado.
      // A aplicação React (através do AuthContext) irá detetar a ausência do utilizador
      // e os componentes de rota (ProtectedDashboard) irão tratar do redirecionamento.
      localStorage.removeItem('usuario');
      localStorage.removeItem('authToken');
      // Opcional: redirecionar para a página de login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { apiUrl };
export default apiClient;
