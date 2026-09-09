import { Head, Html, Main, NextScript } from 'next/document';

import Script from 'next/script';

export default function MyDocument() {
  return (
    <Html translate="no" className="overscroll-none">
      <Head>
        <Script
          src={`${process.env.BASE_PATH || ''}/__ENV.js`}
          strategy="beforeInteractive"
        />
      </Head>
      <body className="bg-body text-foreground">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
