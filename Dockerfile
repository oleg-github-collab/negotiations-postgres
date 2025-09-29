# Production container for TeamPulse Turbo
FROM node:20-alpine AS base
ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY . .

# Ensure runtime directories exist
RUN mkdir -p logs && chown -R node:node /app

USER node
EXPOSE 3000
CMD ["npm", "start"]
