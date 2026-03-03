// ロゴ画像をSVGからPNGに変換するスクリプト
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const assetsDir = path.join(__dirname, "..", "assets");
const svgPath = path.join(__dirname, "postorial-logo.svg");
const logoSvg = fs.readFileSync(svgPath, "utf-8");

// 背景付きアイコン用SVG（インディゴ→パープルグラデーション）
function makeIconSvg(size, padding) {
  const logoSize = size - padding * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="iconBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1040"/>
        <stop offset="100%" style="stop-color:#2d1052"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#iconBg)"/>
    <svg x="${padding}" y="${padding}" width="${logoSize}" height="${logoSize}" viewBox="0 0 512 512">
      ${logoSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "")}
    </svg>
  </svg>`;
}

// スプラッシュ用SVG（白背景）
function makeSplashSvg(size, logoSize) {
  const offset = (size - logoSize) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#ffffff"/>
    <svg x="${offset}" y="${offset}" width="${logoSize}" height="${logoSize}" viewBox="0 0 512 512">
      ${logoSvg.replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "")}
    </svg>
  </svg>`;
}

async function generate() {
  // icon.png - 1024x1024
  await sharp(Buffer.from(makeIconSvg(1024, 160)))
    .png()
    .toFile(path.join(assetsDir, "icon.png"));
  console.log("icon.png 生成完了");

  // adaptive-icon.png - 1024x1024（Android用は余白多め）
  await sharp(Buffer.from(makeIconSvg(1024, 200)))
    .png()
    .toFile(path.join(assetsDir, "adaptive-icon.png"));
  console.log("adaptive-icon.png 生成完了");

  // splash-icon.png - 200x200, 白背景
  await sharp(Buffer.from(makeSplashSvg(200, 160)))
    .png()
    .toFile(path.join(assetsDir, "splash-icon.png"));
  console.log("splash-icon.png 生成完了");

  // favicon.png - 48x48
  await sharp(Buffer.from(makeIconSvg(256, 30)))
    .resize(48, 48)
    .png()
    .toFile(path.join(assetsDir, "favicon.png"));
  console.log("favicon.png 生成完了");

  console.log("\n全アイコン生成完了！");
}

generate().catch(console.error);
