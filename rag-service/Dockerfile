FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate 2>/dev/null || true
RUN npm run build
RUN chown -R node:node /app

USER node

EXPOSE 4000

CMD ["npm", "run", "start"]