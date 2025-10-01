const allowedOrigins = [
    'https://app.fazeresolve.com',
    'https://fazeresolve.onrender.com',
    /^https:\/\/(www\.)?fazeresolve\.onrender\.com$/, // Permite com e sem 'www'
    /^http:\/\/localhost(:\d+)?$/,                 // Permite qualquer porta em localhost
    'https://accounts.google.com',
];

const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
};

module.exports = { corsOptions, allowedOrigins };