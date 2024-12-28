// server.js
import express from 'express';
import publicRoutes from './routes/public.js';
import privateRoutes from './routes/private.js';
import auth from './middlewares/auth.js';
import cors from 'cors';

const app = express();

app.use(express.json()); //middleware que permite o uso de json, um middleware é uma função que recebe requisição, resposta e next, next é uma função que chama o próximo middleware
app.use(cors({ origin: '*' })); // Permite requisições de qualquer origem

app.use('/', publicRoutes);
app.use('/', auth, privateRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => { //arrow function, forma mais moderna de escrever uma função
  console.log('Server is running on port 3000');
});

