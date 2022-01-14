FROM node:16

USER node

WORKDIR /usr/src/user-backend

COPY --chown=node:node . .

ENV DEBUG=user-backend:*

RUN npm ci

CMD npm start