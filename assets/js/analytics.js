// Load Google Analytics dynamically
(function () {
    var script = document.createElement('script');
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=G-RCBJL1DSHT";
    document.head.appendChild(script);
  
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
  
    gtag('js', new Date());
    gtag('config', 'G-RCBJL1DSHT');
  })();
  