 require('dotenv').config();
const express = require('express');
const authRoutes = require('./src/routes/authRoutes');

const app = express();

// Middlewares essenciais
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rota principal da API para autenticacao
app.use('/api/auth', authRoutes);

// Rota de health check
app.get('/', (req, res) => {
    res.status(200).json({ status: 'API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});