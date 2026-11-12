# Stage 1: Build
FROM node:22-slim AS builder
WORKDIR /app

# Copy package.json files first for layer caching
COPY package.json ./
COPY contract/package.json contract/
COPY server/package.json server/
COPY web/package.json web/

# Install all dependencies (including devDependencies for building)
RUN npm install

# Copy source code
COPY contract/ contract/
COPY server/ server/
COPY web/ web/
COPY tsconfig.base.json ./

# Build: TypeSpec -> OpenAPI -> TypeScript types -> Vite -> tsc
RUN npm run build

# Stage 2: Runtime
FROM node:22-slim
WORKDIR /app

# Copy built server code
COPY --from=builder /app/server/dist ./dist/

# Copy built frontend assets
COPY --from=builder /app/web/dist ./web/dist/

# Copy server package.json for production dependencies
COPY --from=builder /app/server/package.json ./

# Install only production dependencies
RUN npm install --production

ENV STATIC_DIR=/app/web/dist
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]