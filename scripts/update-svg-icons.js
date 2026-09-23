import fs from 'fs';
import path from 'path';

const publicDir = path.resolve(process.cwd(), 'public');
const b64 = fs.readFileSync(path.join(publicDir, 'pwa-512x512.png')).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="108" fill="#ffffff" />
  <image href="data:image/png;base64,${b64}" x="0" y="0" width="512" height="512" />
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svg);

const maskableB64 = fs.readFileSync(path.join(publicDir, 'pwa-maskable-512x512.png')).toString('base64');
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" fill="#ffffff" />
  <image href="data:image/png;base64,${maskableB64}" x="0" y="0" width="512" height="512" />
</svg>`;
fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), maskableSvg);
console.log('Successfully updated icon.svg and icon-maskable.svg with main web page logo!');
