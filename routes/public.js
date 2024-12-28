import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// Endpoint de Cadastro
router.post("/cadastro", async (req, res) => {
    try {
        const user = req.body;
        console.log("Dados do usuário recebidos:", user);

        // Gerar hash da senha
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(user.password, salt);

        // Salvar usuário no banco de dados
        const savedUser = await prisma.user.create({
            data: {
                name: user.name,
                email: user.email,
                password: hash,
            },
        });
        console.log("Usuário salvo no banco de dados:", savedUser);

        // Gerar o token JWT
        const token = jwt.sign({ userId: savedUser.id }, JWT_SECRET, { expiresIn: '1h' });

        // Retornar o token e dados do usuário (sem a senha)
        res.status(201).json({
            message: "Cadastro realizado com sucesso",
            token: token,
            user: {
                id: savedUser.id,
                name: savedUser.name,
                email: savedUser.email,
            },
        });
    } catch (err) {
        console.error("Erro ao realizar cadastro:", err);
        res.status(500).json({ error: "Erro ao realizar cadastro" });
    }
});

// Endpoint de Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log("Tentativa de login com email:", email);

        // Buscar usuário pelo email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log("Usuário não encontrado:", email);
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Verificar senha
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("Senha incorreta para o usuário:", email);
            return res.status(401).json({ error: "Senha incorreta" });
        }

        // Gerar o token JWT
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '10m' });

        res.status(200).json({
            message: "Login bem-sucedido",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (err) {
        console.error("Erro ao realizar login:", err);
        res.status(500).json({ error: "Erro ao realizar login" });
    }
});

// Endpoint para buscar dados do usuário
router.get("/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: "Token não fornecido" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, name: true, email: true }, // Campos retornados
        });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error("Erro ao buscar dados do usuário:", err);
        res.status(500).json({ error: "Erro ao buscar dados do usuário" });
    }
});


// Rota para salvar preferências
router.post("/preferences", async (req, res) => {
    try {
        const { fashionTarget, birthDate, address, theme, gender } = req.body;
        
        // Verificar o token de autenticação
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Token não fornecido" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Buscar usuário pelo ID decodificado no token
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Verificar se o usuário já tem preferências registradas
        const existingPreferences = await prisma.preferences.findUnique({
            where: { userId: user.id },
        });

        if (existingPreferences) {
            // Se já existirem preferências, atualizar
            const updatedPreferences = await prisma.preferences.update({
                where: { userId: user.id },
                data: {
                    fashionTarget,
                    birthDate,
                    address,
                    theme,
                    gender,
                },
            });
            return res.status(200).json({
                message: "Preferências atualizadas com sucesso",
                preferences: updatedPreferences,
            });
        }

        // Se não existir, criar novas preferências
        const newPreferences = await prisma.preferences.create({
            data: {
                fashionTarget,
                birthDate,
                address,
                theme,
                gender,
                userId: user.id, // Associar as preferências ao usuário
            },
        });

        res.status(201).json({
            message: "Preferências salvas com sucesso",
            preferences: newPreferences,
        });
    } catch (err) {
        console.error("Erro ao salvar preferências:", err);
        res.status(500).json({ error: "Erro ao salvar preferências" });
    }
});

// Endpoint para buscar as preferências do usuário
router.get("/preferences", async (req, res) => {
    try {
        // Verificar o token de autenticação
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Token não fornecido" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Buscar usuário pelo ID decodificado no token
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Buscar as preferências do usuário
        const preferences = await prisma.preferences.findUnique({
            where: { userId: user.id },
        });

        if (!preferences) {
            return res.status(404).json({ error: "Preferências não encontradas" });
        }

        // Retornar as preferências do usuário
        res.status(200).json(preferences);
    } catch (err) {
        console.error("Erro ao buscar preferências:", err);
        res.status(500).json({ error: "Erro ao buscar preferências" });
    }
});

// Endpoint para cadastrar um novo look
router.post("/looks", async (req, res) => {
    try {
        const { title, description, photo } = req.body;
        console.log("Dados do look recebidos:", req.body);

        // Verificar token de autenticação
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Token não fornecido" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Buscar usuário pelo ID
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Criar um novo look
        const newLook = await prisma.look.create({
            data: {
                title,
                description,
                photo,
                userId: user.id, // Associar o look ao usuário
            },
        });

        res.status(201).json({
            message: "Look cadastrado com sucesso",
            look: newLook,
        });
    } catch (err) {
        console.error("Erro ao cadastrar look:", err);
        res.status(500).json({ error: "Erro ao cadastrar look" });
    }
});

// Endpoint para listar todos os looks do usuário
router.get("/looks", async (req, res) => {
    try {
        // Verificar token de autenticação
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Token não fornecido" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // Buscar usuário pelo ID
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        // Buscar todos os looks do usuário
        const looks = await prisma.look.findMany({
            where: { userId: user.id },
        });

        res.status(200).json(looks);
    } catch (err) {
        console.error("Erro ao listar looks:", err);
        res.status(500).json({ error: "Erro ao listar looks" });
    }
});

export default router;


