const path = require('path');

const copyLinkedFiles = require('remark-copy-linked-files');
const images = require('remark-images');

const MD_MEDIA_COPIES = 'md-media-copies';
const destinationDir = path.join(__dirname, 'public', MD_MEDIA_COPIES);

const makeNewUrlFn = ({filename, fullpath}) => {
  return `/${MD_MEDIA_COPIES}/${filename}`;
}

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [
      [copyLinkedFiles, { destinationDir, makeNewUrlFn }],
      images,
    ]
  }
})
module.exports = withMDX({
  pageExtensions: ['js', 'jsx', 'mdx', 'md'],
})
