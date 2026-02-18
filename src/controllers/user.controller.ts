import { Request, Response } from 'express';
import prisma from '@/config/prisma';
import { CreateUserDTO } from '@/types/user.types';

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name }: CreateUserDTO = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
      },
    });

    res.status(201).json({ 
      message: 'User created successfully!',
      user 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFavorites = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { favoriteStations: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const stations = await prisma.station.findMany({
      where: {
        id: {
          in: user.favoriteStations,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.status(200).json(stations);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, stationId } = req.params;

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station) {
      res.status(404).json({ error: 'Station not found' });
      return;
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: { favoriteStations: { push: stationId } },
      select: { favoriteStations: true },
    });
    res.status(200).json(user);
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, stationId } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        favoriteStations: {
          set: user.favoriteStations.filter(sid => sid !== stationId),
        },
      },
      select: { favoriteStations: true },
    });
    res.status(200).json(updated);
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};