const esbuild = require('esbuild');
const fs = require('fs');

const header = `// ==UserScript==
// @name         Tribal Wars OFF/DEF Marker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Marcador OFF/DEF interactivo para el mapa de Tribal Wars
// @author       You
// @match        https://*.guerrastribales.es/game.php?*screen=map*
// @match        https://*.guerrastribales.es/game.php?*screen=ally*
// @grant        none
// ==/UserScript==
`;

esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    outfile: 'dist/tw-marker.user.js',
    banner: {
        js: header
    }
}).catch(() => process.exit(1));

// Secondary compilation: Legal Script format
// No headers, minified, suitable for quick bar or remote loading.
esbuild.build({
    entryPoints: ['src/index.ts'],
    bundle: true,
    minify: true,
    format: 'iife',
    outfile: 'dist/tw-marker.legal.js',
}).catch(() => process.exit(1));
