import jwt from 'jsonwebtoken';
import { dbGet } from '../utils/db.js';

const SESSION_SECRET = process.env.SESSION_SECRET || 'TEMP: development secret';

export async function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.ek_session || req.session?.token;
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const payload = jwt.verify(token, SESSION_SECRET);
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [payload.sub]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid session' });
        }
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}
