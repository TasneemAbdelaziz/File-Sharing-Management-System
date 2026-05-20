FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies before copying source for better caching
COPY package*.json ./
RUN npm install --production

# Copy application source
COPY . .

# Use non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3031
CMD ["node", "src/index.js"]
