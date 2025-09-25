// Load Lottie library
const lottieScripts = document.createElement('script');
lottieScripts.src = "https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.0/lottie.min.js";
lottieScripts.onload = initLottie;
document.head.appendChild(lottieScripts);

function initLottie() {
  const services = [
    {id:'lottie-website', path:'assets/lottie/website.json'},
    {id:'lottie-automation', path:'assets/lottie/automation.json'},
    {id:'lottie-brand', path:'assets/lottie/brand.json'},
    {id:'lottie-marketing', path:'assets/lottie/marketing.json'},
    {id:'lottie-social', path:'assets/lottie/social.json'},
    {id:'lottie-partner', path:'assets/lottie/partner.json'},
  ];

  services.forEach(service => {
    lottie.loadAnimation({
      container: document.getElementById(service.id),
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: service.path
    });
  });
}