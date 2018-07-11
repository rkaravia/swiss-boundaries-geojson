#!/bin/bash
set -o errexit
set -o nounset

for TEXT_FILE in "$@"; do
    if ! isutf8 "$TEXT_FILE" &> /dev/null; then
        CHARSET=`uchardet "$TEXT_FILE"`
        echo "Converting $TEXT_FILE from $CHARSET to UTF-8..."
        iconv --from-code $CHARSET --to-code UTF-8 "$TEXT_FILE" --output "$TEXT_FILE"
    fi
done
