import fs from 'fs';
import path from 'path';
import https from 'https';
import AdmZip from 'adm-zip';

const data = JSON.parse(fs.readFileSync('assets_urls.json', 'utf8'));
const assets = data.assets;

const downloadDir = 'public/assets';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const options = {
      headers: {
        'User-Agent': 'Wget/1.21.2'
      }
    };
    https.get(url, options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400) {
        const location = response.headers.location;
        if (location) {
          console.log(`Redirecting to ${location}`);
          file.close();
          fs.unlink(dest, () => {});
          return downloadFile(location, dest).then(resolve).catch(reject);
        } else {
          reject(new Error(`Redirect without location header for ${url}`));
          return;
        }
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadPdfs(urls, dir) {
  await Promise.all(urls.map(async (url, index) => {
    const chapter = (index + 1).toString().padStart(2, '0');
    const dest = path.join(dir, `ch${chapter}.pdf`);
    if (fs.existsSync(dest)) {
      console.log(`Skipping ${dest}, already exists`);
      return;
    }
    console.log(`Downloading ${dest} from ${url}`);
    try {
      await downloadFile(url, dest);
      console.log(`Downloaded ${dest}`);
    } catch (err) {
      console.error(`Error downloading ${dest}: ${err.message}`);
    }
  }));
}

async function downloadAudios(urls, dir, mapping, levelKey) {
  for (let index = 0; index < urls.length; index++) {
    const url = urls[index];
    const chapter = (index + 1).toString().padStart(2, '0');
    const zipPath = path.join(dir, `ch${chapter}.zip`);
    const extractDir = path.join(dir, `ch${chapter}`);
    if (fs.existsSync(extractDir)) {
      console.log(`Skipping ${zipPath}, extract dir ${extractDir} already exists`);
      // Still need to map the audio files
      const chapterNum = index + 1;
      mapping[chapterNum].audio = {};
      const files = fs.readdirSync(extractDir);
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const prefix = levelKey === 'starter' ? 'X' : 'Y';
          const match = file.match(new RegExp(`${prefix}_\\[(\\d{2}-\\d{2})\\]_(.+)\\.mp3`));
          if (match) {
            const id = match[1];
            mapping[chapterNum].audio[id] = `/assets/${levelKey}/audio/ch${chapter}/${file}`;
          }
        }
      }
      continue;
    }
    console.log(`Downloading ${zipPath} from ${url}`);
    try {
      await downloadFile(url, zipPath);
      console.log(`Downloaded ${zipPath}, extracting to ${extractDir}`);
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractDir, true);
      console.log(`Extracted to ${extractDir}`);

      // Map audio files
      const chapterNum = index + 1;
      mapping[chapterNum].audio = {};
      const files = fs.readdirSync(extractDir);
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const prefix = levelKey === 'starter' ? 'X' : 'Y';
          const match = file.match(new RegExp(`${prefix}_\\[(\\d{2}-\\d{2})\\]_(.+)\\.mp3`));
          if (match) {
            const id = match[1];
            mapping[chapterNum].audio[id] = `/assets/${levelKey}/audio/ch${chapter}/${file}`;
          }
        }
      }

      fs.unlinkSync(zipPath);
    } catch (err) {
      console.error(`Error downloading/extracting ${zipPath}: ${err.message}`);
    }
  }
}

async function main() {
  console.log('Starting downloads...');

  const levelData = {};
  const levelsMap = {};

  // Group assets by level
  for (const asset of assets) {
    if (!levelsMap[asset.level]) {
      levelsMap[asset.level] = [];
    }
    levelsMap[asset.level].push(asset);
  }

  for (const [levelKey, levelAssets] of Object.entries(levelsMap)) {
    console.log(`Processing level: ${levelKey}`);

    const mapping = {};
    const maxChapters = Math.max(
      ...levelAssets.map(asset => asset.urls.length)
    );
    for (let i = 1; i <= maxChapters; i++) {
      mapping[i] = {};
    }

    const promises = [];
    for (const asset of levelAssets) {
      const dir = path.join(downloadDir, levelKey, asset.lang || 'audio');
      fs.mkdirSync(dir, { recursive: true });
      if (asset.type === 'pdf') {
        promises.push(downloadPdfs(asset.urls, dir));
      } else if (asset.type === 'audio') {
        promises.push(downloadAudios(asset.urls, dir, mapping, levelKey));
      }
    }
    await Promise.all(promises);

    // Add pdf paths
    for (const asset of levelAssets) {
      if (asset.type === 'pdf') {
        for (let i = 0; i < asset.urls.length; i++) {
          if (!mapping[i + 1].lang) mapping[i + 1].lang = {};
          mapping[i + 1].lang[asset.lang] = `/assets/${levelKey}/${asset.lang}/ch${(i + 1).toString().padStart(2, '0')}.pdf`;
        }
      }
    }

    const languages = [];
    for (const asset of levelAssets) {
      if (asset.type === 'pdf') {
        languages.push({ id: asset.lang, name: asset.name });
      }
    }

    const chapters = Object.entries(mapping).map(([id, data]) => ({
      id: parseInt(id),
      audio: data.audio || {},
      lang: data.lang || {}
    }));

    levelData[levelKey] = {
      chapters,
      languages
    };
  }

  console.log('All downloads completed.');

  fs.mkdirSync('public/assets', { recursive: true });
  fs.writeFileSync('public/assets/data.json', JSON.stringify({ levels: levelData, languages: data.languages }, null, 2));
  console.log('Created data.json');
}

main().catch(console.error);