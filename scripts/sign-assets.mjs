import crypto from 'crypto';
import fs from 'fs';

const usage = `
Usage: HMAC_SECRET=<secret> node scripts/sign-assets.mjs [input] [output]

  input   Path to the assets_urls.json file (default: public/assets_urls.json)
  output  Path to write the signed file (default: same as input)

Environment:
  HMAC_SECRET  Required. The shared secret for HMAC-SHA256 signing.
`;

function generateSignature(url, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(new URL(url).toString())
    .digest('hex');
}

function main() {
  const secret = process.env.HMAC_SECRET;
  if (!secret) {
    console.error('Error: HMAC_SECRET environment variable is required.');
    console.error(usage);
    process.exit(1);
  }

  const inputPath = process.argv[2] || 'public/assets_urls.json';
  const outputPath = process.argv[3] || inputPath;

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.assets)) {
    console.error('Error: Missing or invalid "assets" array in JSON.');
    process.exit(1);
  }

  let totalSigned = 0;

  for (const asset of data.assets) {
    if (!Array.isArray(asset.urls)) {
      console.warn(`Warning: Asset "${asset.id}" has no urls array. Skipping.`);
      asset.signatures = [];
      continue;
    }

    asset.signatures = asset.urls.map(url => {
      totalSigned++;
      return generateSignature(url, secret);
    });
  }

  // Write with 2-space indent to match current formatting
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');

  console.log(`Signed ${totalSigned} URL(s) across ${data.assets.length} asset(s).`);
  console.log(`Wrote to: ${outputPath}`);
}

main();
