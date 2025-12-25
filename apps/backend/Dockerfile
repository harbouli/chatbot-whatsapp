FROM node:22-alpine

WORKDIR /app

# Copy root package.json and lockfile (if available)
# In a real monorepo with proper workspace handling, we'd need to copy the workspace config too.
# For simplicity in this Dockerfile, we will just copy the backend app and install its deps.
# However, since we are using pnpm workspaces, we should probably use pnpm to install.
# But to make it self-contained for this specific service without copying the whole repo context excessively:

COPY apps/backend/package.json ./
COPY apps/backend/tsconfig.json ./

RUN npm install -g pnpm && pnpm install

COPY apps/backend/src ./src

EXPOSE 3000

CMD ["pnpm", "dev"]
