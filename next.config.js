const path = require('path');

const copyLinkedFiles = require('./remark-plugin/copy-links'); // version that logs even more stuff
const images = require('./remark-plugin/images'); // version that logs something during build

const MD_MEDIA_COPIES = 'md-media-copies';
const destinationDir = path.join(__dirname, 'public', MD_MEDIA_COPIES);

const makeNewUrlFn = ({filename, fullpath}) => {
  return `/${MD_MEDIA_COPIES}/${filename}`;
}

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [
      [copyLinkedFiles, { destinationDir, makeNewUrlFn}],
      images,
    ]
  }
})
module.exports = withMDX({
  pageExtensions: ['js', 'jsx', 'mdx', 'md'],
})
