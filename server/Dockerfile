# Multi-stage build for Server
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install

# Copy server code
COPY server/ ./server/

# Generate Prisma client and build
WORKDIR /app/server
RUN npx prisma generate
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ../
COPY server/package*.json ./
RUN npm install --only=production

COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=builder /app/server/prisma ./prisma
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/src/swagger ./dist/swagger

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]

