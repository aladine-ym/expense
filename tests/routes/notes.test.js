import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../server/app.js';

describe('Notes API', () => {
    let app;

    beforeEach(() => {
        app = createApp();
    });

    it('should return 401 for unauthenticated requests', async () => {
        const response = await request(app).get('/api/notes');
        expect(response.status).toBe(401);
    });

    it('should create a new expense', async () => {
        // TODO: mock authentication and database
        expect(true).toBe(true);
    });

    it('should validate expense payload', async () => {
        // TODO: test validation middleware
        expect(true).toBe(true);
    });
});
