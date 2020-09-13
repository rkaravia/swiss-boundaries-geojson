const axios = require("axios");
const fs = require("fs");
const path = require("path");
const prettyCompact = require("json-stringify-pretty-compact");
const shapefile = require("shapefile");
const shelljs = require("shelljs");
const swissgrid = require("swissgrid");
const turfBbox = require("@turf/bbox").default;
const turfMeta = require("@turf/meta");
const unzipper = require("unzipper");

const versions = [
  {
    version: "2020",
    encoding: "utf-8",
    layerRegExp: /BOUNDARIES_2020\/DATEN\/swissBOUNDARIES3D\/SHAPEFILE_LV95_LN02\/.*/,
    url:
      "https://github.com/rkaravia/swiss-boundaries-archive/releases/download/2020.0/swissBOUNDARIES3D-2020.0.zip",
  },
  {
    version: "2019",
    archiveName: "SHAPEFILE_LV95_LN02.zip",
    encoding: "windows-1252",
    layerRegExp: /SHAPEFILE_LV95_LN02\/.*/,
    url:
      "https://github.com/rkaravia/swiss-boundaries-archive/releases/download/2019.0/swissBOUNDARIES3D-2019.0.zip",
  },
  {
    version: "2018",
    archiveName: "swissBOUNDARIES3D_LV95.zip",
    layerRegExp: /swissBOUNDARIES3D_LV95\/SHAPEFILE_LV95_LN02\/.*/,
    url:
      "https://github.com/rkaravia/swiss-boundaries-archive/releases/download/2018.0/swissBOUNDARIES3D-2018.0.zip",
  },
];

const dataDir = path.resolve(__dirname, "data");

run();

async function run() {
  for (const { version, url, ...options } of versions) {
    const downloadDir = path.resolve(dataDir, "download");
    const file = await download(url, downloadDir);

    const shapefilesDir = path.resolve(dataDir, "shapefiles", version);
    await extract(file, shapefilesDir, options);

    const geojsonLv95Dir = path.resolve(
      dataDir,
      "geojson-lv95",
      version
    );
    await convert(shapefilesDir, geojsonLv95Dir, options);

    const geojsonDir = path.resolve(dataDir, "geojson", version);
    await reproject(geojsonLv95Dir, geojsonDir);
  }

  writeIndex(dataDir);
}

async function download(url, targetDir) {
  shelljs.mkdir("-p", targetDir);

  const filename = path.basename(new URL(url).pathname);
  const targetFile = path.join(targetDir, filename);

  if (fs.existsSync(targetFile)) {
    console.log(`${filename} already exists`);
    return Promise.resolve(targetFile);
  }

  console.log(`${filename} is downloading...`);
  const response = await axios.get(url, { responseType: "stream" });
  const stream = response.data.pipe(fs.createWriteStream(targetFile));
  return new Promise((resolve) => {
    stream.on("finish", () => resolve(targetFile));
  });
}

async function extract(srcFile, targetDir, { archiveName, layerRegExp }) {
  shelljs.mkdir("-p", targetDir);

  const outerZipStream = fs.createReadStream(srcFile);
  const innerZipStream = archiveName
    ? outerZipStream.pipe(unzipper.ParseOne(archiveName))
    : outerZipStream;
  const contentStream = innerZipStream
    .pipe(unzipper.Parse())
    .on("entry", (entry) => {
      const filename = entry.path;
      if (layerRegExp.test(filename)) {
        const targetFile = path.join(targetDir, path.basename(filename));
        entry.pipe(fs.createWriteStream(targetFile));
      } else {
        entry.autodrain();
      }
    });

  return new Promise((resolve) => {
    contentStream.on("finish", () => resolve());
  });
}

async function convert(sourceDir, targetDir, { encoding }) {
  shelljs.mkdir("-p", targetDir);

  const shapefiles = shelljs.ls(path.resolve(sourceDir, "*.shp"));
  for (const filename of shapefiles) {
    const basename = path.basename(filename, ".shp");
    console.log(`Convert ${basename}`);

    const geojson = await shapefile.read(filename, undefined, { encoding });
    geojson.crs = {
      properties: {
        name: "urn:ogc:def:crs:EPSG::2056",
      },
      type: "name",
    };

    geojson.features
      .filter(({ properties: { BFS_NUMMER } }) => BFS_NUMMER === 261)
      .forEach(({ properties: { NAME } }) => {
        console.log("Name of Zurich:", NAME);
      });

    const targetFile = path.join(targetDir, `${basename}.geojson`);
    fs.writeFileSync(targetFile, prettyCompactGeojson(geojson, 5));
  }
}

function reproject(sourceDir, targetDir) {
  shelljs.mkdir("-p", targetDir);

  const lv95Files = shelljs.ls(path.resolve(sourceDir, "*.geojson"));
  for (const lv95File of lv95Files) {
    console.log("Reproject", path.basename(lv95File, ".geojson"));

    const geojson = JSON.parse(fs.readFileSync(lv95File));

    delete geojson.crs;
    turfMeta.coordEach(geojson, (coordinates) => {
      [coordinates[0], coordinates[1]] = swissgrid.unproject(coordinates);
    });

    const targetFile = path.join(targetDir, path.basename(lv95File));
    fs.writeFileSync(targetFile, prettyCompactGeojson(geojson, 7));
  }
}

function prettyCompactGeojson(geojson, precision) {
  const factor = 10 ** precision;
  const roundToPrecision = (coordinate) =>
    Math.round(coordinate * factor) / factor;

  turfMeta.coordEach(geojson, (coordinates) => {
    for (let i = 0; i < coordinates.length; i++) {
      coordinates[i] = roundToPrecision(coordinates[i]);
    }
  });

  if (geojson.bbox) {
    geojson.bbox = turfBbox(geojson);
  }

  return prettyCompact(geojson) + "\n";
}

function writeIndex(targetDir) {
  const title = "swiss-boundaries-geojson";
  const index = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            max-width: 800px;
            margin: 0 auto;
            padding: 16px;
          }

          pre {
            background-color: #ddd;
            padding: 8px;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>

        <p>
          The swissBOUNDARIES3D dataset as GeoJSON.
        </p>

        <h2>License</h2>

        <a href="https://opendata.swiss/en/terms-of-use/#terms_by">
          Open use. Must provide the source.
        </a>

        <ul>
          <li>You may use this dataset for non-commercial purposes.</li>
          <li>You may use this dataset for commercial purposes.</li>
          <li>You must provide the source (author, title and link to the dataset).</li>
        </ul>

        <p>
          Source:
          <a href="https://shop.swisstopo.admin.ch/en/products/landscape/boundaries3D">
            Swiss Federal Office of Topography
          </a>
        </p>

        <h2>Data</h2>

        ${versions
          .map(
            ({ version }) => `
          <h3>${version}</h3>

          <pre><b>Standard GeoJSON (WGS 84)</b>\n${listDir("geojson", version)
            .map(({ name, path }) => `<a download href="${path}">${name}</a>`)
            .join("\n")}</pre>
          
          <pre><b>GeoJSON in Swiss projection (LV95)</b>\n${listDir("geojson-lv95", version)
            .map(({ name, path }) => `<a download href="${path}">${name}</a>`)
            .join("\n")}</pre>`
          )
          .join("")}

        <h2>Code</h2>
        
        <p>
          <a href="https://github.com/rkaravia/swiss-boundaries-geojson">Conversion source code on GitHub</a>
        </p>
      </body>
    </html>
  `;
  const targetFile = path.resolve(targetDir, "index.html");

  fs.writeFileSync(targetFile, index);
}

function listDir(format, version) {
  return fs
    .readdirSync(path.resolve(dataDir, format, version))
    .map((name) => ({ name, path: `${format}/${version}/${name}` }));
}
