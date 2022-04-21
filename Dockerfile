FROM tailor/docker-libvips:node-10.9

ARG SOURCE_VERSION=na
ENV SOURCE_VERSION=$SOURCE_VERSION

WORKDIR /app
ADD . .

RUN apt-get update && apt-get install -y software-properties-common ffmpeg

RUN rm -rf node_modules && npm install -g node-gyp && npm install
EXPOSE 3200

CMD ["npm", "start"]
