import fs from 'fs';
import path from 'path';
import https from 'https';
import AdmZip from 'adm-zip';

const urls = JSON.parse(fs.readFileSync('assets_urls.json', 'utf8'));

const downloadDir = 'dist/assets';

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
  await Promise.all(Object.entries(urls).map(async ([chapter, url]) => {
    const dest = path.join(dir, `ch${chapter.padStart(2, '0')}.pdf`);
    console.log(`Downloading ${dest} from ${url}`);
    try {
      await downloadFile(url, dest);
      console.log(`Downloaded ${dest}`);
    } catch (err) {
      console.error(`Error downloading ${dest}: ${err.message}`);
    }
  }));
}

async function downloadAudios(urls, dir) {
  for (const [chapter, url] of Object.entries(urls)) {
    const zipPath = path.join(dir, `ch${chapter.padStart(2, '0')}.zip`);
    const extractDir = path.join(dir, `ch${chapter.padStart(2, '0')}`);
    console.log(`Downloading ${zipPath} from ${url}`);
    try {
      await downloadFile(url, zipPath);
      console.log(`Downloaded ${zipPath}, extracting to ${extractDir}`);
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractDir, true);
      console.log(`Extracted to ${extractDir}`);
      fs.unlinkSync(zipPath);
    } catch (err) {
      console.error(`Error downloading/extracting ${zipPath}: ${err.message}`);
    }
  }
}

async function main() {
  console.log('Starting downloads...');

  const promises = [];
  for (const [key, data] of Object.entries(urls)) {
    const dir = path.join(downloadDir, data.download_path);
    fs.mkdirSync(dir, { recursive: true });
    if (data.type === 'pdf') {
      promises.push(downloadPdfs(data.urls, dir));
    } else if (data.type === 'audio') {
      promises.push(downloadAudios(data.urls, dir));
    }
  }
  await Promise.all(promises);

  console.log('All downloads completed.');

  // Create mapping JSON
  const mapping = {};
  for (let i = 1; i <= 18; i++) {
    mapping[i] = {};
    for (const [key, data] of Object.entries(urls)) {
      if (data.type === 'pdf') {
        mapping[i][key] = `/assets/${data.download_path}/ch${i.toString().padStart(2, '0')}.pdf`;
      } else if (data.type === 'audio') {
        mapping[i].audio_path = `/assets/${data.download_path}/ch${i.toString().padStart(2, '0')}`;
      }
    }
  }

  const languages = [];
  for (const [key, data] of Object.entries(urls)) {
    if (data.display_name) {
      languages.push({ id: key, displayName: data.display_name });
    }
  }

  fs.writeFileSync('dist/assets.json', JSON.stringify({ mapping, languages }, null, 2));
  console.log('Created assets.json');
}

main().catch(console.error);