FROM node:20-alpine

WORKDIR /app

RUN mkdir -p /var/log/pm2

COPY package.json ./
RUN npm install --production

COPY . .

EXPOSE 3005

CMD ["npm", "start"]
