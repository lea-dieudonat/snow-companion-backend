import { afterEach } from 'vitest';
import prisma from '@/config/prisma';

afterEach(async () => {
  await prisma.trip.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
});
