import { MapCore } from './core/map';
import { Overlay } from './ui/overlay';
import { Panel } from './ui/panel';
import { Dashboard } from './dashboard/Dashboard';

// Userscript header will be added by a post-build step or simple comment at the top if needed.

declare const TWMap: any;
declare const $: any;
declare const game_data: any;

function initMap() {
    MapCore.init();
    Overlay.init();

    const panel = new Panel();

    // Intercept clicks on the map to show the panel
    if (typeof TWMap !== 'undefined' && TWMap.mapHandler) {
        const originalOnClick = TWMap.mapHandler.onClick;
        
        TWMap.mapHandler.onClick = function(x: number, y: number, event: MouseEvent) {
            // Find if a village was clicked
            const villageId = MapCore.getVillageIdAt(x, y);

            if (villageId) {
                // If it's a right click or alt+click, or we just want to intercept
                // For this script, we'll open our panel
                panel.show(villageId, event.pageX, event.pageY);
                
                // Block the default TW popup if we are holding shift, or just show ours alongside.
                // It's usually better to prevent default if holding a key.
                if (event.shiftKey) {
                    return false;
                }
            } else {
                panel.hide();
            }

            // Call original handler
            if (originalOnClick) {
                return originalOnClick.apply(this, arguments);
            }
            return true;
        };
    } else {
        // Fallback generic click listener
        const mapMover = document.getElementById('map_mover') || document.getElementById('map');
        if (mapMover) {
            mapMover.addEventListener('click', (e) => {
                // Approximate generic detection if TWMap.mapHandler is not found
            });
        }
    }

    panel.onStatusChange((villageId, status) => {
        Overlay.updateOverlays();
    });
}

function initDashboard() {
    const dashboard = new Dashboard();
    dashboard.render();
}

function init() {
    const searchParams = new URLSearchParams(window.location.search);
    const screen = searchParams.get('screen');
    const mode = searchParams.get('mode');

    if (screen === 'map') {
        initMap();
    } else if (screen === 'ally' && mode && mode.startsWith('members')) {
        initDashboard();
    }
}

// Wait for TWMap or game_data to be fully loaded
if (document.readyState === 'complete') {
    init();
} else {
    window.addEventListener('load', () => {
        // slight delay to ensure TW scripts initialized
        setTimeout(init, 1000);
    });
}
