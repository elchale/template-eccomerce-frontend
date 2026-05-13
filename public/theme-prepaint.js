// Pre-paint theme hydration — runs synchronously before React mounts
// to prevent flash-of-wrong-theme on hard refresh.
// This file is in /public so it is served as-is with no transform.
(function () {
    try {
        var t = localStorage.getItem('site-theme');
        if (t) document.documentElement.setAttribute('data-theme', t);

        var raw = localStorage.getItem('site-theme-custom-colors');
        if (raw && t) {
            var colors = JSON.parse(raw);
            var keys = Object.keys(colors);
            if (keys.length) {
                var lines = keys
                    .map(function (k) {
                        return '  ' + k + ': ' + colors[k] + ';';
                    })
                    .join('\n');
                var style = document.createElement('style');
                style.id = 'site-theme-overrides';
                style.textContent = '[data-theme="' + t + '"] {\n' + lines + '\n}';
                document.head.appendChild(style);
            }
        }
    } catch (e) {}
})();
