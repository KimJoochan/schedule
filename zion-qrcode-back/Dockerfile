FROM node:18-alpine

# docker-compose의 볼륨 경로와 일치하도록 수정
WORKDIR /usr/src/api_app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["npm", "run", "start"]