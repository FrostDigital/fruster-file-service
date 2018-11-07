FROM mhart/alpine-node:11.1

RUN apk add --update bash && \
    rm -rf /var/cache/apk/*

RUN uname -a

RUN apk add --update --update-cache \
    --repository https://dl-3.alpinelinux.org/alpine/edge/testing/ \
    --repository https://dl-3.alpinelinux.org/alpine/edge/main/ \
    vips-dev fftw-dev gcc g++ make build-base python

WORKDIR /app
ADD . .

RUN npm install -g node-gyp && npm install
EXPOSE 3200

CMD ["node", "app.js"]
