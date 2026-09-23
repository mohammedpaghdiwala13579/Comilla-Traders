import sharp from 'sharp';
import path from 'path';

async function generateIconsFromMainLogo() {
  const publicDir = path.resolve(process.cwd(), 'public');
  const logoPath = path.join(publicDir, 'comilla-logo.png');

  console.log('Generating PWA icons from main web page logo:', logoPath);

  // 192x192 icon
  await sharp(logoPath)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png');

  // 512x512 icon
  await sharp(logoPath)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png');

  // 512x512 maskable icon with 15% safe-zone margin on white background
  const innerLogoSize = Math.round(512 * 0.82); // ~420px
  const resizedInner = await sharp(logoPath)
    .resize(innerLogoSize, innerLogoSize, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 254, g: 254, b: 254, alpha: 1 },
    },
  })
    .composite([
      {
        input: resizedInner,
        gravity: 'center',
      },
    ])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Created pwa-maskable-512x512.png (maskable safe zone)');

  // 180x180 Apple touch icon
  await sharp(logoPath)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');

  // 32x32 favicon
  await sharp(logoPath)
    .resize(32, 32, { fit: 'cover' })
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ Created favicon-32x32.png');

  console.log('All PWA icons synchronized with main web page logo successfully!');
}

generateIconsFromMainLogo().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
