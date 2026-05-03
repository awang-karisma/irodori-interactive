import fs from 'fs';
import path from 'path';
import https from 'https';
import AdmZip from 'adm-zip';

const urls = JSON.parse(fs.readFileSync('assets_urls.json', 'utf8'));

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

async function downloadAudios(urls, dir, mapping) {
  for (const [chapter, url] of Object.entries(urls)) {
    const paddedChapter = chapter.padStart(2, '0');
    const zipPath = path.join(dir, `ch${paddedChapter}.zip`);
    const extractDir = path.join(dir, `ch${paddedChapter}`);
    console.log(`Downloading ${zipPath} from ${url}`);
    try {
      await downloadFile(url, zipPath);
      console.log(`Downloaded ${zipPath}, extracting to ${extractDir}`);
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractDir, true);
      console.log(`Extracted to ${extractDir}`);

      // Map audio files
      const chapterNum = parseInt(chapter);
      mapping[chapterNum].audio = {};
      const files = fs.readdirSync(extractDir);
      for (const file of files) {
        if (file.endsWith('.mp3')) {
          const match = file.match(/X_\[(\d{2}-\d{2})\]_(.+)\.mp3/);
          if (match) {
            const id = match[1];
            mapping[chapterNum].audio[id] = `/assets/${dir.split('/').pop()}/ch${paddedChapter}/${file}`;
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

  const mapping = {};
  for (let i = 1; i <= 18; i++) {
    mapping[i] = {};
  }

  const promises = [];
  for (const [key, data] of Object.entries(urls)) {
    const dir = path.join(downloadDir, data.download_path);
    fs.mkdirSync(dir, { recursive: true });
    if (data.type === 'pdf') {
      promises.push(downloadPdfs(data.urls, dir));
    } else if (data.type === 'audio') {
      promises.push(downloadAudios(data.urls, dir, mapping));
    }
  }
  await Promise.all(promises);

  // Add pdf paths
  for (const [key, data] of Object.entries(urls)) {
    if (data.type === 'pdf') {
      for (let i = 1; i <= 18; i++) {
        mapping[i][key] = `/assets/${data.download_path}/ch${i.toString().padStart(2, '0')}.pdf`;
      }
    }
  }

  console.log('All downloads completed.');

  const languages = [];
  for (const [key, data] of Object.entries(urls)) {
    if (data.display_name) {
      languages.push({ id: key, displayName: data.display_name });
    }
  }

  fs.writeFileSync('public/assets.json', JSON.stringify({ mapping, languages }, null, 2));
  console.log('Created assets.json');
}

main().catch(console.error);