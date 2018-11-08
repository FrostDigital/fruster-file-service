FROM tailor/docker-libvips:node-8.6

WORKDIR /app
ADD . .

RUN npm install -g node-gyp && npm install
EXPOSE 3200

CMD ["node", "app.js"]
