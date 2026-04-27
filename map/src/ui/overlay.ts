import { Classifier } from '../core/classifier';
import { StorageService, type VillageStatus } from '../data/storage';
import { Geometry, type Point } from '../core/geometry';

declare const TWMap: any;

export class Overlay {
    private static overlays: Record<string, HTMLElement> = {};
    private static polygons: Record<string, SVGElement> = {};
    private static container: HTMLElement;
    private static svgContainer: SVGSVGElement;
    private static initialized: boolean = false;

    static init() {
        if (this.initialized) return;
        this.initialized = true;

        this.container = document.createElement('div');
        this.container.id = 'map_custom_overlay_container';
        this.container.style.position = 'absolute';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.pointerEvents = 'none'; // Click through
        this.container.style.zIndex = '10';
        
        this.svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgContainer.style.position = 'absolute';
        this.svgContainer.style.top = '0';
        this.svgContainer.style.left = '0';
        this.svgContainer.style.width = '100%';
        this.svgContainer.style.height = '100%';
        this.svgContainer.style.pointerEvents = 'none';
        this.svgContainer.style.zIndex = '0';
        this.container.appendChild(this.svgContainer);

        // Wait for TWMap container to be ready
        // mapMover is the container where we append the overlay.
        const mapMover = document.getElementById('map_container') || document.getElementById('map') || document.querySelector('.map_container') || document.body;
        if (mapMover) {
            mapMover.appendChild(this.container);
        }

        // Hook into TWMap spawnSector or render loop
        const loop = () => {
            this.updateOverlays();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    static updateOverlays() {
        if (!this.initialized) return;

        // Ensure container is appended to the map's root element
        if (typeof TWMap !== 'undefined' && TWMap.map && TWMap.map.el) {
            // TWMap.map.el might be a jQuery object, so we get the raw DOM element
            const mapEl = TWMap.map.el instanceof HTMLElement ? TWMap.map.el : (TWMap.map.el[0] || document.getElementById('map'));
            if (mapEl && this.container.parentElement !== mapEl) {
                mapEl.appendChild(this.container);
                this.container.style.position = 'absolute';
                this.container.style.left = '0';
                this.container.style.top = '0';
                this.container.style.width = '100%';
                this.container.style.height = '100%';
                this.container.style.zIndex = '50000';
                this.container.style.pointerEvents = 'none';
            }
        }

        if (typeof TWMap === 'undefined' || !TWMap.villages) {
            return;
        }

        const currentMapIds = new Set<string>();

        // We check what villages are currently visible
        // TWMap.villages contains loaded villages
        for (const id in TWMap.villages) {
            const v = TWMap.villages[id];
            const status = Classifier.getVillageStatus(id);

            if (status !== 'NONE') {
                currentMapIds.add(id);
                this.drawOverlay(id, v, status);
            } else if (this.overlays[id]) {
                this.removeOverlay(id);
            }
        }

        // Remove old overlays
        for (const id in this.overlays) {
            if (!currentMapIds.has(id)) {
                this.removeOverlay(id);
            }
        }

        // --- DRAW GROUPS POLYGONS ---
        const groupsData = StorageService.getGroupsData();
        const groupVillages: Record<string, string[]> = {};
        for (const villageId in groupsData.villageGroups) {
            const groupName = groupsData.villageGroups[villageId];
            if (!groupVillages[groupName]) {
                groupVillages[groupName] = [];
            }
            groupVillages[groupName].push(villageId);
        }

        const activeGroups = new Set<string>();

        for (const groupName in groupVillages) {
            activeGroups.add(groupName);
            const villages = groupVillages[groupName] || [];
            const color = groupsData.groups[groupName]?.color || 'rgba(255, 255, 255, 0.4)';
            
            let points: Point[] = [];
            for (const id of villages) {
                const xyId = parseInt(id, 10);
                if (!isNaN(xyId) && TWMap.map && TWMap.map.pos) {
                    const x = Math.floor(xyId / 1000);
                    const y = xyId % 1000;
                    
                    const pixelX = (x * TWMap.tileSize[0]) - TWMap.map.pos[0];
                    const pixelY = (y * TWMap.tileSize[1]) - TWMap.map.pos[1];
                    
                    // Add 4 corners of the village tile with some padding
                    const p = 5; // padding
                    points.push({ x: pixelX - p, y: pixelY - p });
                    points.push({ x: pixelX + TWMap.tileSize[0] + p, y: pixelY - p });
                    points.push({ x: pixelX - p, y: pixelY + TWMap.tileSize[1] + p });
                    points.push({ x: pixelX + TWMap.tileSize[0] + p, y: pixelY + TWMap.tileSize[1] + p });
                }
            }
            
            if (points.length > 0) {
                const hull = Geometry.getConvexHull(points);
                this.drawGroupPolygon(groupName, hull, color);
            }
        }

        for (const groupName in this.polygons) {
            if (!activeGroups.has(groupName)) {
                const poly = this.polygons[groupName];
                if (poly && poly.parentElement) {
                    poly.parentElement.removeChild(poly);
                }
                delete this.polygons[groupName];
            }
        }
    }

    private static drawOverlay(id: string, village: any, status: VillageStatus) {
        let el = this.overlays[id];
        if (!el) {
            el = document.createElement('div');
            el.className = 'map_custom_marker';
            el.style.position = 'absolute';
            el.style.width = TWMap.tileSize[0] + 'px';
            el.style.height = TWMap.tileSize[1] + 'px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontWeight = 'bold';
            el.style.fontSize = '24px';
            el.style.textShadow = '0px 0px 3px black';
            el.style.zIndex = '50000';
            el.style.pointerEvents = 'none';

            this.container.appendChild(el);
            this.overlays[id] = el;
        }

        if (el) {
            // Coordinate positioning
            const xyId = parseInt(id, 10);
            if (isNaN(xyId)) {
                return;
            }
            
            const x = Math.floor(xyId / 1000);
            const y = xyId % 1000;
            
            if (TWMap.map && TWMap.map.pos) {
                // TWMap.map.pos is the top-left pixel offset of the current map viewport.
                // We convert village coordinates to global pixel coordinates, then subtract the viewport offset.
                const pixelX = (x * TWMap.tileSize[0]) - TWMap.map.pos[0];
                const pixelY = (y * TWMap.tileSize[1]) - TWMap.map.pos[1];
                el.style.left = pixelX + 'px';
                el.style.top = pixelY + 'px';
            }

            if (status === 'OFF') {
                el.innerHTML = '⚔️';
                el.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                el.style.border = '2px solid red';
            } else if (status === 'DEF') {
                el.innerHTML = '🛡️';
                el.style.backgroundColor = 'rgba(0, 0, 255, 0.3)';
                el.style.border = '2px solid blue';
            }
        }
    }

    private static removeOverlay(id: string) {
        const el = this.overlays[id];
        if (el && el.parentElement) {
            el.parentElement.removeChild(el);
        }
        delete this.overlays[id];
    }

    private static drawGroupPolygon(groupName: string, hull: Point[], color: string) {
        let poly = this.polygons[groupName];
        if (!poly) {
            poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            poly.style.pointerEvents = 'none';
            this.svgContainer.appendChild(poly);
            this.polygons[groupName] = poly;
        }
        
        const pointsStr = hull.map(p => `${p.x},${p.y}`).join(' ');
        poly.setAttribute('points', pointsStr);
        poly.setAttribute('fill', color);
        poly.setAttribute('stroke', color.replace(/[\d.]+\)$/, '0.8)'));
        poly.setAttribute('stroke-width', '2');
        poly.setAttribute('stroke-linejoin', 'round');
    }
}
