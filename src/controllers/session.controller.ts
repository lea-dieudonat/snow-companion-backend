import { Request, Response } from "express";
import prisma from '@/config/prisma';
import { CreateSessionDTO } from "@/types/session.types";

export const createSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, station, conditions, tricks, notes, photos, userId }: CreateSessionDTO = req.body;

        // Validation basique
        if (!date || !station || !userId) {
            res.status(400).json({ message: "Date, station, and userId are required." });
            return;
        }

        // Création de la session
        const session = await prisma.session.create({
            data: {
                date: new Date(date),
                station,
                conditions: conditions || null,
                tricks: tricks || [],
                notes: notes || null,
                photos: photos || [],
                userId
            }
        });
        
        res.status(201).json({
            message: "Session created successfully. 🏂",
            session
        });
    } catch (error) {
        console.error("Error creating session:", error);
        res.status(500).json({ message: "An error occurred while creating the session." });
    }
};

export const getAllSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const sessions = await prisma.session.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    },
                },
            },
            orderBy: {
                date: 'desc'
            }
        });
        
        res.status(200).json(sessions);
    } catch (error) {
        console.error("Error fetching sessions:", error);
        res.status(500).json({ message: "An error occurred while fetching sessions." });
    }
};