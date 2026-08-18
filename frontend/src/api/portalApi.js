// src/api/portalApi.js
import apiClient from './apiClient';

/**
 * Fetches the complete, up-to-date state of a Pedido.
 * @param {string} token - The unique publicId of the order.
 * @returns {Promise<Object>} The full Pedido object.
 */
export const getPedidoState = (token) => {
    return apiClient.get(`/portal/${token}`);
};

/**
 * Submits a suggested date for the technical visit.
 * @param {string} token - The unique publicId of the order.
 * @param {string} dataSugerida - The client's suggested date and time.
 * @returns {Promise<Object>} The updated Pedido object.
 */
export const sugerirVisita = (token, dataSugerida) => {
    return apiClient.post(`/portal/${token}/sugerir-visita`, { data_sugerida: dataSugerida });
};

/**
 * Approves the budget.
 * @param {string} token - The unique publicId of the order.
 * @returns {Promise<Object>} The updated Pedido object.
 */
export const aprovarOrcamento = (token) => {
    return apiClient.post(`/portal/${token}/aprovar-orcamento`, {});
};

/**
 * Declines the budget.
 * @param {string} token - The unique publicId of the order.
 * @returns {Promise<Object>} The updated Pedido object.
 */
export const recusarOrcamento = (token) => {
    return apiClient.post(`/portal/${token}/recusar-orcamento`, {});
};

/**
 * Informs the provider of a manual payment (e.g., PIX).
 * @param {string} token - The unique publicId of the order.
 * @param {string} tipo - The type of payment (e.g., 'sinal').
 * @param {string} metodo - The payment method (e.g., 'pix').
 * @returns {Promise<Object>} The updated Pedido object.
 */
export const informarPagamento = (token, tipo, metodo) => {
    return apiClient.post(`/portal/${token}/informar-pagamento`, { tipo, metodo });
};
