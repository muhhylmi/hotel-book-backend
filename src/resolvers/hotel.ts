import { Context } from '../types/context.js';

export const hotelResolvers = {
  Query: {
    hotels: async (_: any, { city }: any, { prisma }: Context) => {
      const where = city ? { city: { contains: city, mode: 'insensitive' as any } } : {};

      const hotels = await prisma.hotel.findMany({
        where,
        include: {
          rooms: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return hotels.map(hotel => ({
        ...hotel,
        createdAt: hotel.createdAt.toISOString(),
        rooms: hotel.rooms.map(room => ({
          ...room,
          createdAt: room.createdAt.toISOString()
        }))
      }));
    },

    hotel: async (_: any, { id }: any, { prisma }: Context) => {
      const hotel = await prisma.hotel.findUnique({
        where: { id },
        include: {
          rooms: true
        }
      });

      if (!hotel) {
        throw new Error('Hotel not found');
      }

      return {
        ...hotel,
        createdAt: hotel.createdAt.toISOString(),
        rooms: hotel.rooms.map(room => ({
          ...room,
          createdAt: room.createdAt.toISOString()
        }))
      };
    }
  },

  Mutation: {
    createHotel: async (_: any, args: any, { prisma, user }: Context) => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Admin access required');
      }

      const hotel = await prisma.hotel.create({
        data: {
          name: args.name,
          description: args.description,
          address: args.address,
          city: args.city,
          country: args.country,
          imageUrl: args.imageUrl
        },
        include: {
          rooms: true
        }
      });

      return {
        ...hotel,
        createdAt: hotel.createdAt.toISOString(),
        rooms: []
      };
    },

    updateHotel: async (_: any, args: any, { prisma, user }: Context) => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Admin access required');
      }

      const { id, ...updateData } = args;

      const hotel = await prisma.hotel.update({
        where: { id },
        data: updateData,
        include: {
          rooms: true
        }
      });

      return {
        ...hotel,
        createdAt: hotel.createdAt.toISOString(),
        rooms: hotel.rooms.map(room => ({
          ...room,
          createdAt: room.createdAt.toISOString()
        }))
      };
    },

    deleteHotel: async (_: any, { id }: any, { prisma, user }: Context) => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Admin access required');
      }

      await prisma.hotel.delete({
        where: { id }
      });

      return true;
    },

    updateRoom: async (_: any, args: any, { prisma, user }: Context) => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Admin access required');
      }

      const { id, ...updateData } = args;

      const room = await prisma.room.update({
        where: { id },
        data: updateData,
        include: {
          hotel: true
        }
      });

      return {
        ...room,
        createdAt: room.createdAt.toISOString(),
        hotel: {
          ...room.hotel,
          createdAt: room.hotel.createdAt.toISOString()
        }
      };
    },

    deleteRoom: async (_: any, { id }: any, { prisma, user }: Context) => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Admin access required');
      }

      await prisma.room.delete({
        where: { id }
      });

      return true;
    },

    createRoom: async (_: any, args: any, { prisma, user }: Context) => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Admin access required');
      }

      const room = await prisma.room.create({
        data: {
          hotelId: args.hotelId,
          name: args.name,
          description: args.description,
          type: args.type,
          price: args.price,
          capacity: args.capacity,
          imageUrl: args.imageUrl,
          amenities: args.amenities
        },
        include: {
          hotel: true
        }
      });

      return {
        ...room,
        createdAt: room.createdAt.toISOString(),
        hotel: {
          ...room.hotel,
          createdAt: room.hotel.createdAt.toISOString()
        }
      };
    }
  },

  Hotel: {
    rooms: async (parent: any, _: any, { prisma }: Context) => {
      const rooms = await prisma.room.findMany({
        where: { hotelId: parent.id }
      });

      return rooms.map(room => ({
        ...room,
        createdAt: room.createdAt.toISOString()
      }));
    }
  },

  Room: {
    hotel: async (parent: any, _: any, { prisma }: Context) => {
      const hotel = await prisma.hotel.findUnique({
        where: { id: parent.hotelId }
      });

      return hotel ? {
        ...hotel,
        createdAt: hotel.createdAt.toISOString()
      } : null;
    }
  }
};