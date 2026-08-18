/**
 * Middleware para prevenir o cache de respostas da API.
 * Define os cabeçalhos apropriados para instruir o navegador e proxies a não armazenarem a resposta em cache.
 */
const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
};

module.exports = noCache;
