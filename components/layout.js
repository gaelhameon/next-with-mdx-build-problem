import Head from 'next/head';



const Layout = (props) => (
  <div className='container mt-3 border'>
    <Head>
      <title>gaelhameon.com</title>
    </Head>
    {/* <Header /> */}
    {props.children}
  </div>
);

export default Layout;
