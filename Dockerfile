FROM node:20-alpine

# eliminar dotenvx si está instalado globalmente
RUN npm uninstall -g @dotenvx/dotenvx 2>/dev/null || true

WORKDIR /app

COPY package.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "-r", "reflect-metadata", "dist/index.js"]