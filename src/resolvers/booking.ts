import { Context } from '../types/context.js';
import { createXenditInvoice } from '../services/xendit.js';

export const bookingResolvers = {
  Query: {
    myBookings: async (_: any, __: any, { prisma, user }: Context) => {
      if (!user) {
        throw new Error('Not authenticated');
      }

      const bookings = await prisma.booking.findMany({
        where: { userId: user.id },
        include: {
          user: true,
          room: {
            include: {
              hotel: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return bookings.map(booking => ({
        ...booking,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        user: {
          ...booking.user,
          createdAt: booking.user.createdAt.toISOString()
        },
        room: {
          ...booking.room,
          createdAt: booking.room.createdAt.toISOString(),
          hotel: {
            ...booking.room.hotel,
            createdAt: booking.room.hotel.createdAt.toISOString()
          }
        }
      }));
    },

    booking: async (_: any, { id }: any, { prisma, user }: Context) => {
      if (!user) {
        throw new Error('Not authenticated');
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          user: true,
          room: {
            include: {
              hotel: true
            }
          }
        }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.userId !== user.id && user.role !== 'ADMIN') {
        throw new Error('Access denied');
      }

      return {
        ...booking,
        checkIn: booking.checkIn.toISOString(),
        checkOut: booking.checkOut.toISOString(),
        createdAt: booking.createdAt.toISOString(),
        user: {
          ...booking.user,
          createdAt: booking.user.createdAt.toISOString()
        },
        room: {
          ...booking.room,
          createdAt: booking.room.createdAt.toISOString(),
          hotel: {
            ...booking.room.hotel,
            createdAt: booking.room.hotel.createdAt.toISOString()
          }
        }
      };
    }
  },

  Mutation: {
    createBooking: async (_: any, args: any, { prisma, user }: Context) => {
      if (!user) {
        throw new Error('Not authenticated');
      }

      const room = await prisma.room.findUnique({
        where: { id: args.roomId },
        include: { hotel: true }
      });

      if (!room) {
        throw new Error('Room not found');
      }

      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = room.price * days;

      // Check room availability
      const existingBooking = await prisma.booking.findFirst({
        where: {
          roomId: args.roomId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          OR: [
            {
              checkIn: { lte: checkOut },
              checkOut: { gte: checkIn }
            }
          ]
        }
      });

      if (existingBooking) {
        throw new Error('Room is not available for selected dates');
      }

      const booking = await prisma.booking.create({
        data: {
          userId: user.id,
          roomId: args.roomId,
          checkIn,
          checkOut,
          guests: args.guests,
          totalAmount
        },
        include: {
          user: true,
          room: {
            include: {
              hotel: true
            }
          }
        }
      });

      // Create Xendit invoice
      try {
        const invoice = await createXenditInvoice({
          externalId: booking.id,
          amount: totalAmount,
          description: `Hotel booking for ${room.hotel.name} - ${room.name}`,
          payerEmail: user.email,
          successRedirectUrl: `${process.env.FRONTEND_URL}/bookings/${booking.id}?status=success`,
          failureRedirectUrl: `${process.env.FRONTEND_URL}/bookings/${booking.id}?status=failed`
        });

        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            paymentUrl: invoice.invoice_url,
            xenditInvoiceId: invoice.id
          }
        });

        return {
          ...booking,
          checkIn: booking.checkIn.toISOString(),
          checkOut: booking.checkOut.toISOString(),
          createdAt: booking.createdAt.toISOString(),
          paymentUrl: invoice.invoice_url,
          user: {
            ...booking.user,
            createdAt: booking.user.createdAt.toISOString()
          },
          room: {
            ...booking.room,
            createdAt: booking.room.createdAt.toISOString(),
            hotel: {
              ...booking.room.hotel,
              createdAt: booking.room.hotel.createdAt.toISOString()
            }
          }
        };
      } catch (error) {
        console.error('Failed to create Xendit invoice:', error);
        throw new Error('Failed to create payment invoice');
      }
    },

    cancelBooking: async (_: any, { id }: any, { prisma, user }: Context) => {
      if (!user) {
        throw new Error('Not authenticated');
      }

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          user: true,
          room: {
            include: {
              hotel: true
            }
          }
        }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.userId !== user.id && user.role !== 'ADMIN') {
        throw new Error('Access denied');
      }

      if (booking.status === 'CANCELLED') {
        throw new Error('Booking is already cancelled');
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          user: true,
          room: {
            include: {
              hotel: true
            }
          }
        }
      });

      return {
        ...updatedBooking,
        checkIn: updatedBooking.checkIn.toISOString(),
        checkOut: updatedBooking.checkOut.toISOString(),
        createdAt: updatedBooking.createdAt.toISOString(),
        user: {
          ...updatedBooking.user,
          createdAt: updatedBooking.user.createdAt.toISOString()
        },
        room: {
          ...updatedBooking.room,
          createdAt: updatedBooking.room.createdAt.toISOString(),
          hotel: {
            ...updatedBooking.room.hotel,
            createdAt: updatedBooking.room.hotel.createdAt.toISOString()
          }
        }
      };
    }
  }
};