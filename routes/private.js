import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();


router.get('/listar-usuarios', async(req, res) => {

    try{
        //const users = await prisma.user.findMany({omit: {password: true}});
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                // add other fields you want to include
                password: false
            }
        });
        res.status(200).json({ message: "usuarios listados no sistema com sucesso", users });

    }catch{
        res.status(500).json({ error: err.message });
    }
})

export default router;