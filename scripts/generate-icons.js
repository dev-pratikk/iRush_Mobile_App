const fs = require('fs');
const path = require('path');
const { createSquareAsync, generateImageAsync, compositeImagesAsync } = require('@expo/image-utils');

const ICON_SRC = path.join(__dirname, '..', 'assets', 'icon.png');
const ADAPTIVE_FG_SRC = path.join(__dirname, '..', 'assets', 'adaptive-icon-foreground.png');
const RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

// Legacy icon sizes (ic_launcher.png & ic_launcher_round.png)
const LEGACY_SIZES = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

// Adaptive foreground icon sizes (108dp canvas base)
const ADAPTIVE_FG_SIZES = [
  { folder: 'mipmap-mdpi', size: 108 },
  { folder: 'mipmap-hdpi', size: 162 },
  { folder: 'mipmap-xhdpi', size: 216 },
  { folder: 'mipmap-xxhdpi', size: 324 },
  { folder: 'mipmap-xxxhdpi', size: 432 },
];

async function generateIcons() {
  console.log('Generating safe-zone adaptive foreground asset...');

  // 1. Create 1024x1024 white canvas with 600x600 centered logo (58% safe zone for Android circle mask)
  const bgBuffer = await createSquareAsync({ size: 1024, color: '#FFFFFF' });
  const { source: fgLogo } = await generateImageAsync(
    { projectRoot: path.join(__dirname, '..') },
    { src: ICON_SRC, width: 600, height: 600, resizeMode: 'contain' }
  );
  const adaptiveBuffer = await compositeImagesAsync({
    background: bgBuffer,
    foreground: fgLogo,
    x: 212,
    y: 212,
  });

  fs.writeFileSync(ADAPTIVE_FG_SRC, adaptiveBuffer);
  console.log('Generated assets/adaptive-icon-foreground.png');

  // 2. Generate Legacy Launcher Icons (ic_launcher.png & ic_launcher_round.png)
  for (const { folder, size } of LEGACY_SIZES) {
    const targetFolder = path.join(RES_DIR, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const { source: resizedBuffer } = await generateImageAsync(
      { projectRoot: path.join(__dirname, '..') },
      {
        src: ADAPTIVE_FG_SRC,
        width: size,
        height: size,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      }
    );

    fs.writeFileSync(path.join(targetFolder, 'ic_launcher.png'), resizedBuffer);
    fs.writeFileSync(path.join(targetFolder, 'ic_launcher_round.png'), resizedBuffer);

    console.log(`Generated Legacy ${folder} (${size}x${size})`);
  }

  // 3. Generate Adaptive Foreground Icons (ic_launcher_foreground.png)
  for (const { folder, size } of ADAPTIVE_FG_SIZES) {
    const targetFolder = path.join(RES_DIR, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const { source: resizedBuffer } = await generateImageAsync(
      { projectRoot: path.join(__dirname, '..') },
      {
        src: ADAPTIVE_FG_SRC,
        width: size,
        height: size,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      }
    );

    fs.writeFileSync(path.join(targetFolder, 'ic_launcher_foreground.png'), resizedBuffer);

    console.log(`Generated Adaptive Foreground ${folder} (${size}x${size})`);
  }

  console.log('Successfully updated all Android launcher and adaptive icons!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
