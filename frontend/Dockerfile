FROM node:18-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm ci && npm run build && npm prune --production

CMD ["npm", "start"]