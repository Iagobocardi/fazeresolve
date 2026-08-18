// src/api/publicApiClient.js
import axios from 'axios';

const apiUrl = process.env.NODE_ENV === 'production'
  ? 'https://fazeresolve.onrender.com/api'
  : 'http://localhost:3000/api';

const publicApiClient = axios.create({
    baseURL: apiUrl,
});

export default publicApiClient;
