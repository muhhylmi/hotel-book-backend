export const typeDefs = /* GraphQL */ `
  type User {
    id: ID!
    email: String!
    name: String!
    role: Role!
    createdAt: String!
  }

  type Hotel {
    id: ID!
    name: String!
    description: String!
    address: String!
    city: String!
    country: String!
    imageUrl: String
    rating: Float!
    rooms: [Room!]!
    createdAt: String!
  }

  type Room {
    id: ID!
    hotel: Hotel!
    name: String!
    description: String!
    type: String!
    price: Float!
    capacity: Int!
    imageUrl: String
    amenities: [String!]!
    createdAt: String!
  }

  type Booking {
    id: ID!
    user: User!
    room: Room!
    checkIn: String!
    checkOut: String!
    guests: Int!
    totalAmount: Float!
    status: BookingStatus!
    paymentUrl: String
    createdAt: String!
  }

  enum Role {
    USER
    ADMIN
  }

  enum BookingStatus {
    PENDING
    CONFIRMED
    CANCELLED
    COMPLETED
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User
    hotels(city: String): [Hotel!]!
    hotel(id: ID!): Hotel
    myBookings: [Booking!]!
    booking(id: ID!): Booking
  }

  type Mutation {
    register(email: String!, password: String!, name: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    
    createHotel(
      name: String!
      description: String!
      address: String!
      city: String!
      country: String!
      imageUrl: String
    ): Hotel!
    
    createRoom(
      hotelId: ID!
      name: String!
      description: String!
      type: String!
      price: Float!
      capacity: Int!
      imageUrl: String
      amenities: [String!]!
    ): Room!
    
    createBooking(
      roomId: ID!
      checkIn: String!
      checkOut: String!
      guests: Int!
    ): Booking!
    
    cancelBooking(id: ID!): Booking!
  }
`;