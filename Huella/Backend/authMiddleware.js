import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

function verifyToken(req, res, next){
    const authHeader = req.headers['authorization'];

    try {
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]; // Extraemos solo el token pa que jale

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const { id_Usuario, email } = decoded;

            req.user = { id_Usuario, email };

            next();
        }else{
            res.status(401).json({ error: 'Usuario no autorizado' });
            return;
        }

    }catch (e){
        res.status(401).json({ error: 'Usuario no autorizado' });
        return;
    }
}

export default verifyToken;

