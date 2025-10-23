import { createApp } from './app.js';
import './utils/db.js'; // Initialize database

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`ExpenseKeeper server running on port ${PORT}`);
});
