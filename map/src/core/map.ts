// Declare TW globals
declare const TWMap: any;
declare const $: any;

export class MapCore {
    static isFullscreen = false;
    static originalSize = { width: 0, height: 0 };

    static init() {
        if (typeof TWMap === 'undefined') {
            return;
        }
        
        // Add Fullscreen button
        this.addFullscreenButton();
    }

    static addFullscreenButton() {
        const btn = document.createElement('button');
        btn.id = 'btn_custom_fs';
        btn.innerHTML = '⛶ Fullscreen Map';
        btn.style.position = 'fixed';
        btn.style.top = '10px';
        btn.style.right = '10px';
        btn.style.zIndex = '99999';
        btn.style.padding = '8px';
        btn.style.cursor = 'pointer';
        btn.style.background = '#e3d5b8';
        btn.style.border = '2px solid #804000';
        btn.style.borderRadius = '4px';
        btn.style.fontWeight = 'bold';

        btn.addEventListener('click', () => this.toggleFullscreen());
        document.body.appendChild(btn);
    }

    static toggleFullscreen() {
        const mapContainer = document.getElementById('map_whole');
        if (!mapContainer) return;

        if (!this.isFullscreen) {
            // Save original size
            this.originalSize.width = TWMap.size[0];
            this.originalSize.height = TWMap.size[1];

            // Set fullscreen
            mapContainer.style.position = 'fixed';
            mapContainer.style.top = '0';
            mapContainer.style.left = '0';
            mapContainer.style.width = '100vw';
            mapContainer.style.height = '100vh';
            mapContainer.style.zIndex = '9999';
            mapContainer.style.background = '#000';

            const newWidth = Math.floor(window.innerWidth / TWMap.tileSize[0]);
            const newHeight = Math.floor(window.innerHeight / TWMap.tileSize[1]);

            TWMap.resize(newWidth, newHeight);
            this.isFullscreen = true;
            document.getElementById('btn_custom_fs')!.innerHTML = '✖ Exit Fullscreen';
        } else {
            // Restore
            mapContainer.style.position = 'relative';
            mapContainer.style.width = 'auto';
            mapContainer.style.height = 'auto';
            mapContainer.style.zIndex = 'auto';

            TWMap.resize(this.originalSize.width, this.originalSize.height);
            this.isFullscreen = false;
            document.getElementById('btn_custom_fs')!.innerHTML = '⛶ Fullscreen Map';
        }
    }

    static getVillageIdAt(x: number, y: number): string | null {
        // Find village by coordinates
        const xCoord = Math.floor(x);
        const yCoord = Math.floor(y);
        
        // TWMap.villages keys are usually calculated like (x * 1000 + y) or they are inside sectors.
        // But TWMap.villages stores village data where the key is village id
        if (TWMap.villages) {
            for (const id in TWMap.villages) {
                const v = TWMap.villages[id];
                if (v.xy === (xCoord * 1000 + yCoord)) {
                    return id;
                }
            }
        }
        return null;
    }
}
