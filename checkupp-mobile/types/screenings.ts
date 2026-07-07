/**

import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { UserResponse } from '../types/auth';

const prisma = new PrismaClient();

export async function createUser(
  userData: Partial<User>,
): Promise<UserResponse | null> {
  try {
    if (userData.password) {
      userData.password = bcrypt.hashSync(userData.password, 10);
    }

    const newUser = await prisma.user.create({
      data: {
        id: userData.id!,
        username: userData.username!,
        email: userData.email!,
        password: userData.password!,
        role: userData.role || 'USER',
        verified: userData.verified || false,
      },
      include: {
        settings: true,
      },
    });

    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        settings: true,
        sessions: true,
      },
    });
    return user;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
        sessions: true,
      },
    });
    return user;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

export async function getUserByUsername(
  username: string,
): Promise<User | null> {
  try {
    const user = await prisma.user.findFirst({
      where: { username },
      include: {
        settings: true,
      },
    });
    return user;
  } catch (error) {
    console.error('Error fetching user by username:', error);
    return null;
  }
}

export async function updateUser(
  id: string,
  updateData: Partial<User>,
): Promise<User | null> {
  try {
    // Hash password if being updated
    if (updateData.password) {
      updateData.password = bcrypt.hashSync(updateData.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        settings: true,
      },
    });
    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

export async function getAllUsers(): Promise<UserResponse[]> {
  try {
    const users = await prisma.user.findMany({
      include: {
        settings: true,
      },
    });
    return users;
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
}

export async function deleteUserById(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.error('Error deleting user by ID:', error);
    return false;
  }
}

 */
