FROM node:4.4.4
MAINTAINER Kevin Day (@k_day)

RUN useradd --user-group --create-home --shell /bin/false augur &&\
  npm install --global npm@3.9.3

ENV HOME=/home/augur/

# Copy list of dependencies
COPY ./app/package.json /tmp/package.json

# Install dependencies
RUN cd /tmp && npm install

# Copy dependencies libraries
RUN cp -a /tmp/node_modules $HOME

# Copy source code
COPY ./app $HOME

RUN chown -R augur:augur $HOME/*

USER augur
WORKDIR $HOME

CMD ["node","index.js"]
