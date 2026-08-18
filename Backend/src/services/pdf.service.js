// src/services/pdf.service.js
const puppeteer = require('puppeteer');

const generatePdf = async (htmlContent) => {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: true, // headless: true é o padrão, mas explicitamos
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Argumentos comuns para compatibilidade em servidores
        });
        const page = await browser.newPage();

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true, // Garante que cores e imagens de fundo sejam impressas
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        });

        return pdfBuffer;
    } catch (error) {
        console.error("Erro ao gerar PDF com Puppeteer:", error);
        throw error; // Lança o erro para ser apanhado pelo controller
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

module.exports = { generatePdf };