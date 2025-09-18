// widgetbot.js
(async function() {
  // Load config dari JSON
  let config = {
    server: '1411001146788679821',
    channel: '1411001149376430203'
  };

  try {
    const response = await fetch('/assets/js/widgetbot-config.json');
    if (response.ok) {
      config = await response.json();
    }
  } catch (e) {
    console.warn('WidgetBot config JSON not found, using default values');
  }

  // Inject Crate widget script
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@widgetbot/crate@3';
  script.async = true;
  script.defer = true;
  script.onload = () => {
    new Crate({
      server: config.server,
      channel: config.channel
    });
  };
  document.head.appendChild(script);
})();