import { authResolvers } from './auth.js';
import { hotelResolvers } from './hotel.js';
import { bookingResolvers } from './booking.js';

export const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...hotelResolvers.Query,
    ...bookingResolvers.Query
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...hotelResolvers.Mutation,
    ...bookingResolvers.Mutation
  },
  Hotel: hotelResolvers.Hotel,
  Room: hotelResolvers.Room
};