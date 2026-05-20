
export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'tony4prophet',
    expiresInSeconds: 7 * 24 * 60 * 60, // 7 days in seconds
  },
  resetToken: {
    expiresInMs: 60 * 60 * 1000, // 1 hour
  },
};

