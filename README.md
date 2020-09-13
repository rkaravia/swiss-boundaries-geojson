# swiss-boundaries-geojson

This code converts the swissBOUNDARIES3D dataset to
[GeoJSON](https://tools.ietf.org/html/rfc7946)
and publishes the result to
https://labs.karavia.ch/swiss-boundaries-geojson/.

swissBOUNDARIES3D contains all
[national](https://opendata.swiss/en/dataset/swissboundaries3d-landesgrenzen),
[cantonal](https://opendata.swiss/en/dataset/swissboundaries3d-kantonsgrenzen),
[district](https://opendata.swiss/en/dataset/swissboundaries3d-bezirksgrenzen), and
[municipal](https://opendata.swiss/en/dataset/swissboundaries3d-gemeindegrenzen)
boundaries of Switzerland.

## Why?

swissBOUNDARIES3D comes in several formats, but GeoJSON is not among them.
The GeoJSON format is highly interoperable, meaning there are
[many utilities](https://github.com/tmcw/awesome-geojson)
that can read and write it.

## License

This code is licensed under the MIT license, see the LICENSE file.

Please note that the swissBOUNDARIES3D dataset has its own license.
