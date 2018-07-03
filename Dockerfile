FROM debian:buster

WORKDIR /data
ENTRYPOINT ["docker-entrypoint.sh"]

RUN apt-get -qq update && apt-get -y install \
    curl \
    gdal-bin \
    jq \
    unzip \
 && rm -rf /var/lib/apt/lists/*

COPY docker-entrypoint.sh /usr/local/bin/
