FROM node:4.4.4
MAINTAINER Kevin Day (@k_day)

RUN useradd --user-group --create-home --shell /bin/false augur
ENV HOME=/home/augur/

# Copy list of dependencies
COPY ./app/package.json /tmp/package.json

# Copy source code
COPY ./app $HOME

# Install dependencies and Copy dependencies libraries
RUN cd /tmp && npm install \
    && cp -a /tmp/node_modules $HOME \
    && chown -R augur:augur $HOME/*

USER augur
WORKDIR $HOME

CMD ["node","index.js"]
