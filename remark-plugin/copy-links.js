console.log(`very top of copy-links`)

const cheerio = require('cheerio');
const Cp = require('cp-file');
const { default: ForEach } = require('apr-for-each');
const Intercept = require('apr-intercept');
const isRelativeUrl = require('is-relative-url');
const { readFile, exists } = require('mz/fs');
const { dirname, resolve, basename, extname, join } = require('path');
const revHash = require('rev-hash');
const UniqBy = require('lodash.uniqby');
const {inspect } = require('util');

console.log(`top of copy-links after requires`)


// https://github.com/syntax-tree/unist-util-map/blob/bb0567f651517b2d521af711d7376475b3d8446a/index.js
const map = async (tree, iteratee) => {
  const bound = (node) => async (child, index) => {
    return preorder(child, index, node);
  };

  const preorder = async (node, index, parent) => {
    const [, newNode = {}] = await Intercept(iteratee(node, index, parent));
    const { children = [] } = newNode || node;

    return {
      ...node,
      ...newNode,
      children: await Promise.all(children.map(bound(node))),
    };
  };

  return preorder(tree, null, null);
};

function defaultMakeNewUrlFn({ filename, staticPath }) {
  return resolve('/', staticPath, filename);
}

module.exports = (opts = {}) => {
  console.log(`top of atttacher`);
  try {
    const {
      destinationDir,
      staticPath = '/',
      ignoreFileExtensions = [],
      makeNewUrlFn = defaultMakeNewUrlFn,
    } = opts;

    return async (tree, { cwd, path }) => {
      console.log(`top of transformer with file at path: ${path}`);
      const assets = [];

      const handleUrl = async (url) => {
        console.log(`handling url: ${url}`);
        if (!isRelativeUrl(url)) {
          console.log(`not relative`)
          return;
        }

        const ext = extname(url);
        if (!ext || ignoreFileExtensions.includes(ext)) {
          console.log(`ignored extension`)
          return;
        }

        const fullpath = resolve(cwd, path ? dirname(path) : '', url);
        console.log(`resolved fullpath: ${fullpath}`);
        console.log(cwd);
        console.log(path);
        console.log(dirname(path));
        if (!(await exists(fullpath))) {
          console.log(`path does NOT exist on this filesystem`);
          return;
        }

        const rev = revHash(await readFile(fullpath));
        const name = basename(fullpath, ext);
        const filename = `${name}-${rev}${ext}`;
        const newUrl = makeNewUrlFn({
          staticPath,
          filename,
          fullpath,
          name,
          rev,
        });

        console.log(`fullpath ${fullpath} will become ${newUrl}`);

        return {
          fullpath,
          filename,
          url: newUrl,
        };
      };

      const handlers = {
        html: async (node) => {
          let { value: newValue = '' } = node;
          const $ = cheerio.load(newValue);

          const selectors = [
            ['img[src]', 'src'],
            ['video source[src]', 'src'],
            ['video[src]', 'src'],
            ['audio source[src]', 'src'],
            ['audio[src]', 'src'],
            ['video[poster]', 'poster'],
            ['object param[value]', 'value'],
            ['a[href]', 'href'],
          ];

          const urls = selectors.reduce((memo, [selector, attr]) => {
            return memo.concat(
              $(selector)
                .toArray()
                .map(({ attribs }) => attribs[attr]),
            );
          }, []);

          await ForEach(urls, async (url) => {
            const asset = await handleUrl(url);
            if (!asset) {
              return;
            }

            assets.push(asset);
            const { url: newUrl } = asset;
            newValue = newValue.replace(new RegExp(url, `g`), newUrl);
          });

          return Object.assign(node, {
            value: newValue,
          });
        },
        url: async (node) => {
          const asset = await handleUrl(node.url);

          assets.push(asset);
          return Object.assign(node, {
            url: asset ? asset.url || node.url : node.url,
          });
        },
        link: (...args) => handlers.url(...args),
        definition: (...args) => handlers.url(...args),
        image: (...args) => handlers.url(...args),
        jsx: (...args) => handlers.html(...args),
      };

      console.log(`here is the tree: ${inspect(tree, false, 1)}`);
      let nodeCount = 0;
      const newTree = await map(tree, async (node) => {
        nodeCount++;
        try {
          return handlers[node.type] ? handlers[node.type](node) : node;
        } catch (err) {
          console.error(err);
          return node;
        }
      });
      console.log(`Handled that many nodes: ${nodeCount}`)

      console.log(`Will handle these assets:`);
      console.log(assets);
      await ForEach(
        UniqBy(assets.filter(Boolean), 'filename'),
        async ({ fullpath, filename }) => {
          console.log(filename);
          const destPath = join(destinationDir, filename);
          console.log(`Will copy from ${fullpath} to ${destPath}`);
          try {
            await Cp(fullpath, destPath);
          } catch (error) {
            console.log(`Error on ${fullpath}`);
            console.log(error);
          }

          if (await exists(fullpath)) {
            console.log(`${fullpath} does exist`);
          } else {
            console.log(`${fullpath} does not exist`);
          }
        },
        {},
      );

      console.log(`end of transformer for file at path: ${path}`);
      return newTree;
    };
  } catch (error) {
    console.error(`Error in copy-links plugin`);
    console.log(`error in copy-links plugin`);
    console.log(error);
  }

};
