# Choix d'une techno pour mon "blog"

## Préjugé favorable pour MDX
J'ai vu des choses sur MDX dans beaucoup de newsletter récemment et j'avais un peu décidé que je voulais m'en servir.

## Pas séduit par Gatsby

J'ai commencé par regarder ça: https://github.com/eggheadio/gatsby-starter-egghead-blog, parce que j'entends souvent parler de Gatsby + MDX. Mais Gatsby m'a énervé. Il buggait avec des messages pas clairs sur des fichiers que j'avais supprimés, mais qui étaient encore dans son cache, j'ai du apprendre à utiliser `gatsby clean` avant d'avoir réussi à faire quoi que ce soit ...

Je devrais probablement réessayer en prenant le temps de suivre des tutoriels ... mais comme j'ai déjà pris le temps de suivre des tutoriels de Next.js, je suis plutôt reparti là-dessus.

## Retour à Next.js

J'ai quand même pris le temps de chercher des "boilerplates" de blogs avec Next.js, et de combinaisons MDX + Next.js et ça a valu la peine.

Déjà, j'ai découvert qu'il y avait des centaines d'exemples de projet Next.js en tous genres ici: https://github.com/vercel/next.js/tree/canary/examples

Et qu'on pouvait très facilement les installer avec create-next-app. J'ai regardé ces trois là: 

`yarn create next-app --example blog-starter ghn-blog`

`yarn create next-app --example with-mdx ghn-blog-mdx-simple`

`yarn create next-app --example with-mdx-remote ghn-blog-mdx-remote`

### blog-starter
Belle structure pour gérer beaucoup de contenu uniquement en MD, qui est très inspirante. Mais ne dit rien sur MDX. En cherchant ailleurs j'ai essayé manuellement d'ajouter le plugin with-mdx.

Mais la doc du plugin insiste surtout sur le fait que ça permet de créer des pages en déposant directement un .mdx dans le dossier `pages`. Et quand on fait ça, on perd beaucoup de choses par rapport aux pages qui chargent le .md dans une structure de page plus riche. 

Pour voir si je me trompais, c'est là que je suis allé voir l'example with-mdx

### with-mdx
C'est l'exemple le moins riche des trois, ce qui m'a un peu induit en erreur. 

On a une structure très simple, et une seule page en .mdx qui importe un composant bouton. Et quand on lance ça donne un rendu assez moche par rapport au précédent: pas vraiment de mise en page.

Ça m'a donné l'impression qu'avec MDX, il faudrait d'une manière ou d'une autre faire tout le travail de mise en page directement dans chaque fichier .MDX, mais ça me paraissait louche ...

### with-mdx-remote
Il y a un peu plus de doc dans le readme, qui parle de choses compliquées. 

Ici on est bien sur une structure de blog plus compliquée, et on voit que des contenus mdx simples génèrent quand même des pages avec des mises en pages communes. Donc ça m'a rassuré. Mais ça reste compliqué: c'est conçu pour que les mdx puissent venir d'une autre source lors de l'éxécution. Donc les mdx ne peuvent pas vraiment gérer eux-mêmes leurs imports/exports. 

J'ai creusé un peu et ça m'a donné le déclic pour la solution finale.

### Solution finale
J'ai fini par réaliser que dans tous les cas, dans Next.js, une page est un composant React qui va ultimement être envoyé au composant MyApp défini dans _app.js. Il y a plein de manières de créer ce composant page, traditionnellement, à partir d'un fichier .js contenu dans le dossier pages. Les plugins mdx sont de la plomberie qui permet utilimement de générer un composant React à partir de fichiers .md ou .mdx.

Donc ma fausse impression sur les difficultés de mise en page dans le cas du with-mdx simple était bien une fausse impression.

J'ai ajouté ceci dans _app.js: 

```jsx
import '../styles/styles.css';
import Layout from '../components/layout';

export default function MyApp({ Component, pageProps }) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}
```

Et maintenant mes pages générées à partir de .mdx se voient appliquer le Layout, et les styles de styles.css, comme toutes les autres pages. 



### À compléter

* Décrire l'arborscence finale

![arborescence](.\arborescence-finale.png)

* Parler de transclusion
* ...


### Liens

https://joelhooks.com/digital-garden

https://www.christopherbiscardi.com/garden





