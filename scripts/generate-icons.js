const fs = require('fs');
const path = require('path');
const { generateImageAsync } = require('@expo/image-utils');

const ICON_SRC = path.join(__dirname, '..', 'assets', 'icon.png');
const RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const SIZES = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

async function generateIcons() {
  console.log('Generating Android launcher icons from assets/icon.png...');
  const iconBuffer = fs.readFileSync(ICON_SRC);

  for (const { folder, size } of SIZES) {
    const targetFolder = path.join(RES_DIR, folder);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    const { source: resizedBuffer } = await generateImageAsync(
      { projectRoot: path.join(__dirname, '..') },
      {
        src: ICON_SRC,
        width: size,
        height: size,
        resizeMode: 'cover',
        backgroundColor: '#FFFFFF',
      }
    );

    const launcherPath = path.join(targetFolder, 'ic_launcher.png');
    const roundPath = path.join(targetFolder, 'ic_launcher_round.png');
    const fgPath = path.join(targetFolder, 'ic_launcher_foreground.png');

    fs.writeFileSync(launcherPath, resizedBuffer);
    fs.writeFileSync(roundPath, resizedBuffer);
    fs.writeFileSync(fgPath, resizedBuffer);

    console.log(`Generated ${folder} (${size}x${size})`);
  }

  console.log('Successfully updated all Android launcher icons!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
