#!/bin/bash
set -o errexit
set -o nounset

DATA_URL=https://data.geo.admin.ch/ch.swisstopo.swissboundaries3d-land-flaeche.fill/data.zip

INPUT_FILE=swissBOUNDARIES3D.zip
OUTPUT_PATH=output
GEOJSON_OUTPUT_PATH=$OUTPUT_PATH/geojson

if [ ! -f $INPUT_FILE ]; then
    curl -L -o $INPUT_FILE $DATA_URL
fi

mkdir -p $GEOJSON_OUTPUT_PATH
unzip -o -d $OUTPUT_PATH $INPUT_FILE

mv $OUTPUT_PATH/*.zip .
unzip -o *LV95*.zip

find . -name "*.shp" | while read SHAPEFILE; do
    OUTPUT_FILE=$GEOJSON_OUTPUT_PATH/$(basename "$SHAPEFILE" .shp).geojson
    ogr2ogr \
        -f "GeoJSON" \
        /vsistdout/ \
        "$SHAPEFILE" \
        -s_srs EPSG:2056 \
        -t_srs EPSG:4326 \
        -lco RFC7946=YES \
        | jq -c '.' \
        > "$OUTPUT_FILE"
done

TITLE="swissBOUNDARIES3D as RFC 7946 GeoJSON"
MD5SUM=($(md5sum $INPUT_FILE))
TIMESTAMP=$(date --iso-8601=seconds)
cd $OUTPUT_PATH
(
    echo "<html><head>"
    echo "<title>$TITLE</title>"
    echo "<style>pre { background-color: #ddd; padding: 10px }</style>"
    echo "</head><body>"
    echo "<h1>$TITLE<h1>"
    echo "<h2>Metadata</h2>"
    echo "<pre>"
    echo "Source: <a href='$DATA_URL'>$DATA_URL</a>"
    echo "md5sum: $MD5SUM"
    echo "Last successful conversion to GeoJSON: $TIMESTAMP"
    echo "</pre>"
    echo "<h2>Data</h2>"
    echo "<pre>"
    find * -type f | while read FILENAME; do
        echo "<a href='./$FILENAME'>$FILENAME</a>"
    done
    echo "</pre></body></html>"
) | tee index.html > /dev/null
