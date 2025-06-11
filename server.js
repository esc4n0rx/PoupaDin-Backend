require('dotenv').config();
const express = require('express');
const authRoutes = require('./src/routes/authRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');

const app = express();

// Middlewares essenciais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/budget', budgetRoutes);

// Rota de health check
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'API is running',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            budget: '/api/budget'
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Budget API available at http://localhost:${PORT}/api/budget`);
});