FROM debian:buster

WORKDIR /data
ENTRYPOINT ["docker-entrypoint.sh"]

RUN apt-get -qq update && apt-get -y install \
    curl \
    gdal-bin \
    jq \
    moreutils \
    uchardet \
    unzip \
 && rm -rf /var/lib/apt/lists/*

COPY *.sh /usr/local/bin/
