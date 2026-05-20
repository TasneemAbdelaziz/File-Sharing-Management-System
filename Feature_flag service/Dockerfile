FROM node:18-alpine

WORKDIR /usr/src/app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

EXPOSE 3032
CMD ["node", "src/index.js"]
