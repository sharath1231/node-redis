FROM node:argon

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

copy package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

EXPOSE 3000
CMD ["node", "app1.js"]
