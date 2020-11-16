# Comment gérer facilement les médias insérés dans un markdown destiné à devenir une page Next.js

## Problème
Sur un site Next.js classique, tous les éléments statiques doivent être déposés dans le dossier `public` à la racine, alors que le contenu des pages doit être dans le dossier `pages` à la racine. 

Ça peut vite devenir difficile de retrouver quelles images vont avec quelles pages et de garder le tout en ordre.

On aimerait pouvoir garder les images près du contenu qu'elles accompagent, comme ceci: 

![arborescence](.\image-pres-md.png)

Pour les utiliser dans le markdown, on a alors des chemins d'accès assez simples:
```md
![](.\image-pres-md.png)
```

Ça marche bien en local pendant qu'on édite le markdown dans VS Code.

Mais quand la page est rendue dans Next.js, ça ne marche plus:

![page avec image non trouvée](.\image-non-trouvee.png)

Le navigateur cherche une image à l'url http://localhost:3000/notes/.%5Cimage-pres-md.png, et le serveur Next.js ne renvoie rien pour cette url.

## Solution
Mes recherches m'ont mené à cette discussion: https://github.com/vercel/next.js/discussions/12663

Pour gérer les .mdx, le plugin `@next/mdx` fait appel en interne à `@mdx-js/loader`, qui semble utiliser `remarkjs` pour transfromer les fichiers markdown en HTML. `remarkjs` permet d'utiliser des plugins pour personnaliser ce processus de transformation (et éventuellement faire des actions en parallèle du processus de transformation).

C'est la solution suggérée dans la discussion et que nous allons utiliser ici.

### Plugin [remark-copy-linked-files](https://github.com/sergioramos/remark-copy-linked-files) "standard"

On active le plugin avec ces options:

```javascript
const path = require('path');

const copyLinkedFiles = require('remark-copy-linked-files');
const destinationDir = path.join(__dirname, 'public');

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [
      [copyLinkedFiles, { destinationDir  }]
    ]
  }
})
module.exports = withMDX({
  pageExtensions: ['js', 'jsx', 'mdx', 'md'],
})
```
Et on obtient un résultat prometteur: les images sont copiées vers le dossier `public`, avec un hash ajouté à leur nom.

![](.\public-v1.png)

Premier réflexe: on voit que git a envie de suivre ces images. Pas nous: on va plutôt demander à git de suivre les images qu'on dépose directement dans l'arborescence des pages, et celles-ci n'en sont que des copies, qui se génèreront dorénavant automatiquement à chaque `build`. 

On voudrait donc ajouter ces images au .gitignore. Ou alors ajouter tout le dossier public ? Mais peut-être qu'on va un jour vouloir suivre des éléments du dossier public dans git. Ça serait bien d'avoir un sous-dossier. 

On va donc changer notre `destinationDir` pour ajouter un sous dossier, puis ajouter ce sous-dossier au .gitignore

Les images sont maintenant à un endroit ou notre serveur Next.js peut les servir, tout devrait bien aller!

Next.js sert bien les images:
![](.\served-image-success.png)

Par contre, dans la page web, ce n'est toujours pas bon.

![](.\bad-chrome-path.png)

Le plugin standard remplace l'url dans le document HTML par un chemin absolu, qui commence nécessairement à la racine du système où le plugin est exécuté: 

`url: resolve('/', staticPath, filename),`

[(Voir cette ligne avec plus de contexte sur github)](https://github.com/sergioramos/remark-copy-linked-files/blob/f0cb2aeebe03535824129de14548e4bcdf0fdde6/index.js#L59)

 On peut le personnaliser en utilisant l'option staticPath, mais ça ne va pas suffire dans notre cas. Tant que ce code s'exécute sur mon PC, toutes les URL écrites dans les doc HTML produits à partir des `.md` vont commencer par `C:/`

 Pour notre cas d'utilisation, on voudrait plutôt des URL relatives au document courant. On va donc devoir modifier le plugin. 

### Plugin [remark-copy-linked-files](https://github.com/gaelhameon/remark-copy-linked-files) "modifié"

On ajoute une option au plugin, pour qu'il accepte une fonction `makeNewUrlFn`, qui se chargera de construire la nouvelle url à utilser pour chaque image. On initialise avec une fonction par défaut qui correspond à ce que faisait le plugin standard.

```javascript
function defaultMakeNewUrlFn({filename, staticPath}) {
  return resolve('/', staticPath,  filename);
}

module.exports = (opts = {}) => {
  const { destinationDir, staticPath = '/', ignoreFileExtensions = [], makeNewUrlFn = defaultMakeNewUrlFn } = opts;

//[...]
```

Puis, au moment où on doit renvoyer l'URL, on appelle cette fonction, en lui passant toutes les infos disponibles sur le fichier qu'on est en train de traiter. Ça permettra aux utilsateurs de personnaliser l'URL à partir de ces informations.

```javascript
    //[...]

      const rev = revHash(await readFile(fullpath));
      const name = basename(fullpath, ext);
      const filename = `${name}-${rev}${ext}`;

      return {
        fullpath,
        filename,
        url: makeNewUrlFn({staticPath, filename, fullpath, name, rev}),
      };
```

À noter: on pourrait supprimer `staticPath` et laisser les utilsateurs le gérer dans leur fonction externe, puisqu'il n'est appelé nulle part ailleurs dans le plugin. Mais pour préserver la compatiblié, on le conserve pour le moment.

Avec ces modifications, le plugin fonctionne comme avant.

Maintenant, on va le personnaliser pour nos besoins.

### Zoom sur les url Next.js

Le plugin va traiter chaque fichier .md ou .mdx présent dans notre dossier `pages`. Chacun de ces fichiers est transformé en page par Next.js, mais l'URL de ces pages , affiché à une URL correspondant au chemin d'accès au fichier + nom du fichier, **sauf si le fichier s'appelle index.***

![](.\arborescence-complexe.png)


Par exemple, avec l'arborescence ci-dessous, voici ce qu'on obtient à chaque url:

| URL  | Fichier correspondant à la page affichée |
| --- | --- |
| host:port/ | index.js |
| host:port/chart | /chart.js |
| host:port/chart | /chart.js |
| host:port/posts | 404 |
| host:port/posts/post1 | /posts/post1.md |
| host:port/posts/category1 | /posts/category1/index.md |
| host:port/posts/category1/toto | /posts/category1/toto.md |
| host:port/posts/category1/post4 | /posts/category1/post4/index.md |

Si un fichier a un nom autre que index, son URL correspond à son chemin + son nom de fichier sans son extension.
Si un fichier s'appelle index.*, son URL correspond uniquement à son chemin. Le nom du fichier est complètement omis.

Il faut tenir compte de cette particularité quand on calcule le chemin d'accès aux images à partir des noms de fichiers.

### Solution finale

```javascript
// fichier next.config.js
const path = require('path');

const copyLinkedFiles = require('remark-copy-linked-files'); // version locale modifiée

const MD_MEDIA_COPIES = 'md-media-copies';
const destinationDir = path.join(__dirname, 'public', MD_MEDIA_COPIES);


const makeNewUrlFn = ({filename, fullpath}) => {
  const splitFullPath = fullpath.split(path.sep);
  const lastPathPart = splitFullPath.pop();
  if (lastPathPart.match('index')) splitFullPath.pop();
  const relativePath = path.relative(splitFullPath.join(path.sep), path.join(__dirname, 'pages'));
  return path.join(relativePath, MD_MEDIA_COPIES, filename).replace(/\\/g, '/');
}

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [
      [copyLinkedFiles, { destinationDir, makeNewUrlFn }]
    ]
  }
})
module.exports = withMDX({
  pageExtensions: ['js', 'jsx', 'mdx', 'md'],
})
```

Notre fonction personnalisée commence par séparer le chemin complet d'accès au fichier md qui contient l'image. Elle extrait la dernière partie de ce chemin, le nom de fichier. Si ce nom de fichier contient index, elle retire un bout de chemin en plus. 

On a alors dans `splitFullPath` le nom du dossier parent de la page courante, peu importe que cette page soit générée via un index.md ou un fichier avec un autre nom.

On calcule dans `relativePath` le chemin pour remonter au dossier racine `pages` à partir de là. Ce nombre de niveaux à remonter correspond à celui qu'il faudra remonter à partir de l'URL de la page pour revenir à la racine du site. On ajoute alors le nom constant du sous-dossier contenant nos images, puis le nom de l'image, et on a une parfaite URL relative qui pointe vers notre image !

Dernière étape: pour des raisons que je ne me suis pas encore amusé à creuser, ça ne marche pas si on laisse les séparateurs en `\` donc on les remplace par des `/` et tout le monde est content !

![](.\final-result-chrome.png)

