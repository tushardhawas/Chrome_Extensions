// scripts/copyPublic.js
const fs = require('fs-extra');
const path = require('path');

const src = path.resolve(__dirname, '../public');
const dest = path.resolve(__dirname, '../dist');

fs.copySync(src, dest, {
  filter: (srcPath) => {
    // you can filter as needed
    return true;
  }
});
console.log('Copied public/* → dist/');
