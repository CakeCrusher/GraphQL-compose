FROM node:16

WORKDIR /usr/src/user-frontend

COPY . .

RUN npm install

ENV CHOKIDAR_USEPOLLING=true

CMD npm start