FROM node:18-alpine

WORKDIR /home/clocks/frontend

COPY . .

RUN npm ci && npm run build && npm prune --production

CMD ["npm", "start"]