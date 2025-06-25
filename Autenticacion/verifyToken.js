// Autenticacion/verifyToken.js
import 'dotenv/config';      
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secreto_super_seguro';

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  
  const token = authHeader.split(' ')[1];

  jwt.verify(token, SECRET, (err, payload) => {
    if (err) {
      return res
        .status(403)
        .json({ error: 'Token inválido o expirado' });
    }

    req.user = payload; 
    next();            
  });
}

export default verifyToken;

