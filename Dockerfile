# Start from a base Node.js image
FROM node:16-bullseye-slim

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y software-properties-common ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Sharp module requires libvips
RUN apt-get update && \
    apt-get install -y build-essential libvips-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ARG SOURCE_VERSION=na
ENV SOURCE_VERSION=$SOURCE_VERSION

WORKDIR /app
ADD . .

RUN rm -rf node_modules && npm install -g node-gyp && npm install
EXPOSE 3200

CMD ["npm", "start"]

