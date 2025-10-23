import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
    const app = express();

    app.use(morgan('dev'));
    app.use(cors({
        origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
        credentials: true
    }));
    app.use(express.json({ limit: '1mb' }));
    app.use(cookieParser());
    app.use(
        session({
            name: 'expensekeeper.sid',
            secret: process.env.SESSION_SECRET || 'TEMP: development secret',
            resave: false,
            saveUninitialized: false,
            proxy: true,
            cookie: {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 10 * 24 * 60 * 60 * 1000 // 10 days in milliseconds
            }
        })
    );

    app.use(express.static(path.join(__dirname, '..', 'public')));

    app.use('/api', routes);

    app.use((req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });

    app.use((err, _req, res, _next) => {
        // TODO: replace with structured error handling and logging strategy
        // eslint-disable-next-line no-console
        console.error(err);
        res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
    });

    return app;
}
