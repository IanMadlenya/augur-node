FROM node:boron-alpine
MAINTAINER Kevin Day (@k_day)

RUN adduser -D -s /bin/false augur
ENV HOME=/home/augur/

# Copy list of dependencies
COPY ./app/package.json /tmp/package.json

# Copy source code
COPY ./app $HOME

RUN apk update && apk add python curl bash gcc g++ make && rm -rf /var/cache/apk/*
# Install dependencies and Copy dependencies libraries
RUN cd /tmp && npm install

# Copy compiled dependencies to workdir
RUN cp -a /tmp/node_modules $HOME

RUN chown -R augur:augur $HOME/*

USER augur
WORKDIR $HOME

CMD ["node","index.js"]
