import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { CreateUserDTO } from '../types/user.types';

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