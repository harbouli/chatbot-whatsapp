FROM node:22-alpine

WORKDIR /app

COPY apps/frontend/package.json ./

RUN npm install -g pnpm && pnpm install

COPY apps/frontend ./

EXPOSE 5173

CMD ["pnpm", "dev"]
