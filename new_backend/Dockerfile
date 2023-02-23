FROM node:18-alpine

WORKDIR /home/clocks/backend

COPY . .

RUN npm ci && npm prune --production

CMD ["npm", "start"]