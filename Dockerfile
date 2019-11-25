FROM tailor/docker-libvips:node-10.9

WORKDIR /app
ADD . .

RUN rm -rf node_modules && npm install -g node-gyp && npm install
EXPOSE 3200

CMD ["node", "app.js"]
