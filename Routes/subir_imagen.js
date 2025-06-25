
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import 'dotenv/config';

const router = express.Router();

// Configuración Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuración del almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'app', // carpeta en Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
  },
});

// Middleware Multer
const upload = multer({ storage });

/*---------------------------------------------------------
  POST /api/upload
  Body (form-data):
    - file: imagen (tipo archivo)
---------------------------------------------------------*/
router.post('/', upload.single('imagen'), (req, res) => {
  if (!req.file?.path) {
    return res.status(400).json({ message: 'No se subió ninguna imagen' });
  }

  res.status(200).json({
    url: req.file.path,             
    public_id: req.file.filename,  
  });
});

export default router;

