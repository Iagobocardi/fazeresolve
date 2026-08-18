/*
 * -----------------------------------------------------------------
 * FICHEIRO 2: Crie este ficheiro em 'src/controllers/upload.controller.js'
 * -----------------------------------------------------------------
 * Descrição: Este controlador contém a lógica principal. Ele recebe o ficheiro
 * do middleware, faz o upload para o Cloudinary e devolve o URL seguro da imagem.
 */
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const sharp = require('sharp'); // 1. Importe o sharp
const fs = require('fs'); // Módulo para apagar o ficheiro temporário

// Configura o Cloudinary com as credenciais do seu ficheiro .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadProductImage = (req, res) => {
    // O ficheiro está disponível em `req.file` graças ao Multer
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum ficheiro de imagem enviado.' });
    }

    // Cria um stream a partir do buffer do ficheiro em memória
    let stream = cloudinary.uploader.upload_stream(
        {
            folder: "produtos", // Opcional: guarda as imagens numa pasta "produtos" no Cloudinary
            resource_type: "image"
        },
        (error, result) => {
            if (error) {
                console.error('Erro no upload para o Cloudinary:', error);
                return res.status(500).json({ message: 'Erro ao fazer upload da imagem.', error });
            }
            // Se o upload for bem-sucedido, o `result` contém o URL seguro
            res.status(201).json({
                message: "Imagem enviada com sucesso!",
                imageUrl: result.secure_url
            });
        }
    );

    // Envia o buffer do ficheiro para o stream do Cloudinary
    streamifier.createReadStream(req.file.buffer).pipe(stream);
};
// 👇 ADICIONE ESTA NOVA FUNÇÃO AO FINAL DO FICHEIRO 👇
const uploadInvoiceImage = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Nenhum ficheiro de nota fiscal enviado.' });
    }

    let stream = cloudinary.uploader.upload_stream(
        {
            folder: "notas_fiscais", // Guarda numa pasta específica
            resource_type: "image"
        },
        (error, result) => {
            if (error) {
                console.error('Erro no upload da nota fiscal para o Cloudinary:', error);
                return res.status(500).json({ message: 'Erro ao fazer upload da imagem.', error });
            }
            res.status(201).json({
                message: "Nota fiscal enviada com sucesso!",
                imageUrl: result.secure_url
            });
        }
    );

    streamifier.createReadStream(req.file.buffer).pipe(stream);
};
const uploadLogo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Nenhum arquivo de logo foi enviado.' });
  }

  try {
    // Processa a imagem em memória com o sharp a partir do buffer
    const processedImageBuffer = await sharp(req.file.buffer)
      .resize(400) // Redimensiona a largura para 400px
      .webp({ quality: 80 }) // Converte para WebP com 80% de qualidade
      .toBuffer(); // Pega o resultado como um buffer

    // Cria um stream para o Cloudinary a partir do buffer processado
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "logos", // Salva na pasta 'logos'
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          console.error("Erro ao fazer upload do logo para o Cloudinary:", error);
          return res.status(500).json({ message: 'Erro ao fazer upload do logo.' });
        }
        // Envia a URL segura do Cloudinary como resposta
        res.status(201).json({
          message: "Logo enviado com sucesso!",
          url: result.secure_url
        });
      }
    );

    // Envia o buffer processado para o stream do Cloudinary
    streamifier.createReadStream(processedImageBuffer).pipe(stream);

  } catch (error) {
    console.error("Erro ao processar a imagem do logo:", error);
    res.status(500).json({ message: 'Ocorreu um erro ao processar o logo.' });
  }
};


module.exports = {
    uploadProductImage,
    uploadInvoiceImage,
    uploadLogo
};
