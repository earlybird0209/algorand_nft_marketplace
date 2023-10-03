import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head >
        <link rel="stylesheet" href="/css/animate.css" />
        <link rel="stylesheet" href="/css/font-awesome.min.css" />
        <link rel="stylesheet" href="/css/fontello.css" />
        <link rel="stylesheet" href="/css/jquery-ui.css" />
        <link rel="stylesheet" href="/css/lnr-icon.css" />
        <link rel="stylesheet" href="/css/owl.carousel.css" />
        <link rel="stylesheet" href="/css/slick.css" />
        <link rel="stylesheet" href="/css/trumbowyg.min.css" />
        <link rel="stylesheet" href="/css/bootstrap/bootstrap.min.css" />
        {/* <link rel="stylesheet" href="style.css" /> */}

        <link rel="stylesheet" href="/css/custom.css" />

        <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon.png" />
        <script onLoad={c => console.log("loadded")} defer src="https://use.fontawesome.com/releases/v5.3.1/js/all.js"></script>

        <script onError={(err) => console.log("ERROR", err)} src="/js/myalgo.min.js"></script>
        <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@10.1.2/build/highlight.min.js"></script>

        <script src="https://unpkg.com/algosdk@v2.3.0/dist/browser/algosdk.min.js" 
	integrity="sha384-fgeAt2Eu1e4m+Ci+iZyaZGF3GrvtcavVyjUEFuHyhiRjMi60ape5AxIWR08Js1S9" 
	crossorigin="anonymous">
	</script>

        <script src="/js/vendor/jquery/jquery-1.12.3.js"></script>
        <script src="/js/vendor/jquery/popper.min.js"></script>
        <script src="/js/vendor/jquery/uikit.min.js"></script>
        <script src="/js/vendor/bootstrap.min.js"></script>
        <script src="/js/vendor/chart.bundle.min.js"></script>
        <script src="/js/vendor/grid.min.js"></script>
        <script src="/js/vendor/jquery-ui.min.js"></script>
        <script src="/js/vendor/jquery.barrating.min.js"></script>
        <script src="/js/vendor/jquery.countdown.min.js"></script>
        <script src="/js/vendor/jquery.counterup.min.js"></script>
        <script src="/js/vendor/jquery.easing1.3.js"></script>
        <script src="/js/vendor/owl.carousel.min.js"></script>
        <script src="/js/vendor/slick.min.js"></script>
        <script src="/js/vendor/tether.min.js"></script>
        <script src="/js/vendor/trumbowyg.min.js"></script>
        <script src="/js/vendor/waypoints.min.js"></script>
        <script src="/js/dashboard.js"></script>
        <script src="/js/main.js"></script>
        {/* <script  src="js/custom.js"></script> */}

      </Head>

      <body className="preload home3">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}