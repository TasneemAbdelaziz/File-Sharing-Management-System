FROM node:18-alpine

WORKDIR /app

# Install PM2 globally
RUN npm install -g pm2

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 3001

# Start the application using PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
