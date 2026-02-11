import { Request, Response } from "express";
import prisma from '@/config/prisma';
import { CreateSessionDTO } from "@/types/session.types";

export const createSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date, station, conditions, tricks, notes, photos, rating, userId }: CreateSessionDTO = req.body;

        // Validation basique
        if (!date || !station || !userId) {
            res.status(400).json({ message: "Date, station, and userId are required." });
            return;
        }

        // Validation du rating si fourni
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            res.status(400).json({ message: "Rating must be between 1 and 5." });
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
                rating: rating || null,
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

export const updateSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { date, station, conditions, tricks, notes, photos, rating } = req.body;

    // Validation du rating si fourni
    if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
      res.status(400).json({ message: "Rating must be between 1 and 5." });
      return;
    }

    const session = await prisma.session.update({
      where: { id: id as string },
      data: {
        ...(date && { date: new Date(date) }),
        ...(station && { station }),
        ...(conditions !== undefined && { conditions }),
        ...(tricks !== undefined && { tricks }),
        ...(notes !== undefined && { notes }),
        ...(photos !== undefined && { photos }),
        ...(rating !== undefined && { rating }),
      },
    });

    res.json({ 
      message: 'Session updated successfully! 🏂',
      session 
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.session.delete({
      where: { id: id as string },
    });

    res.json({ message: 'Session deleted successfully! 🗑️' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};