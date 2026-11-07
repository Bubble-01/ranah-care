import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/api-error';

const signToken = (id: string, role: Role) =>
  jwt.sign({ role }, env.JWT_SECRET, {
    subject: id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

const publicUser = (u: { id: string; name: string; email: string; role: Role }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
});

export const authService = {
  async register(data: { name: string; email: string; phone?: string; password: string }) {
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new ApiError(409, 'Email sudah terdaftar');

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: await bcrypt.hash(data.password, 10),
        role: 'PASIEN', // registrasi publik hanya untuk pasien
      },
    });
    return { user: publicUser(user), token: signToken(user.id, user.role) };
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, 'Email atau password salah');
    }
    return { user: publicUser(user), token: signToken(user.id, user.role) };
  },

  async me(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, 'User tidak ditemukan');
    return publicUser(user);
  },
};