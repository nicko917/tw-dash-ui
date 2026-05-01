// ==UserScript==
// @name         Tribal Wars OFF/DEF Marker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Marcador OFF/DEF interactivo para el mapa de Tribal Wars
// @author       You
// @match        https://*.guerrastribales.es/game.php?*screen=map*
// @match        https://*.guerrastribales.es/game.php?*screen=ally*
// @grant        none
// ==/UserScript==

"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/core/map.ts
  var MapCore;
  var init_map = __esm({
    "src/core/map.ts"() {
      "use strict";
      MapCore = class {
        static isFullscreen = false;
        static originalSize = { width: 0, height: 0 };
        static init() {
          if (typeof TWMap === "undefined") {
            return;
          }
          this.addFullscreenButton();
        }
        static addFullscreenButton() {
          const btn = document.createElement("button");
          btn.id = "btn_custom_fs";
          btn.innerHTML = "\u26F6 Fullscreen Map";
          btn.style.position = "fixed";
          btn.style.top = "10px";
          btn.style.right = "10px";
          btn.style.zIndex = "99999";
          btn.style.padding = "8px";
          btn.style.cursor = "pointer";
          btn.style.background = "#e3d5b8";
          btn.style.border = "2px solid #804000";
          btn.style.borderRadius = "4px";
          btn.style.fontWeight = "bold";
          btn.addEventListener("click", () => this.toggleFullscreen());
          document.body.appendChild(btn);
        }
        static toggleFullscreen() {
          const mapContainer = document.getElementById("map_whole");
          if (!mapContainer) return;
          if (!this.isFullscreen) {
            this.originalSize.width = TWMap.size[0];
            this.originalSize.height = TWMap.size[1];
            mapContainer.style.position = "fixed";
            mapContainer.style.top = "0";
            mapContainer.style.left = "0";
            mapContainer.style.width = "100vw";
            mapContainer.style.height = "100vh";
            mapContainer.style.zIndex = "9999";
            mapContainer.style.background = "#000";
            const newWidth = Math.floor(window.innerWidth / TWMap.tileSize[0]);
            const newHeight = Math.floor(window.innerHeight / TWMap.tileSize[1]);
            TWMap.resize(newWidth, newHeight);
            this.isFullscreen = true;
            document.getElementById("btn_custom_fs").innerHTML = "\u2716 Exit Fullscreen";
          } else {
            mapContainer.style.position = "relative";
            mapContainer.style.width = "auto";
            mapContainer.style.height = "auto";
            mapContainer.style.zIndex = "auto";
            TWMap.resize(this.originalSize.width, this.originalSize.height);
            this.isFullscreen = false;
            document.getElementById("btn_custom_fs").innerHTML = "\u26F6 Fullscreen Map";
          }
        }
        static getVillageIdAt(x, y) {
          const xCoord = Math.floor(x);
          const yCoord = Math.floor(y);
          if (TWMap.villages) {
            for (const id in TWMap.villages) {
              const v = TWMap.villages[id];
              if (v.xy === xCoord * 1e3 + yCoord) {
                return id;
              }
            }
          }
          return null;
        }
      };
    }
  });

  // src/data/storage.ts
  var StorageService;
  var init_storage = __esm({
    "src/data/storage.ts"() {
      "use strict";
      StorageService = class {
        static STORAGE_KEY = "TW_OFF_DEF_MARKER_DATA";
        static getAllData() {
          try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
          } catch (e) {
            console.error("Failed to parse TW_OFF_DEF_MARKER_DATA", e);
            return {};
          }
        }
        static getVillageData(villageId) {
          const data = this.getAllData();
          return data[villageId] || null;
        }
        static setVillageStatus(villageId, status) {
          const data = this.getAllData();
          if (status === "NONE") {
            delete data[villageId];
          } else {
            data[villageId] = {
              status,
              updatedAt: Date.now()
            };
          }
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        }
        // --- GROUPS LOGIC ---
        static GROUPS_KEY = "TW_OFF_DEF_MARKER_GROUPS";
        static getGroupsData() {
          try {
            const data = localStorage.getItem(this.GROUPS_KEY);
            if (data) {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed.groups)) {
                const newGroups = {};
                parsed.groups.forEach((g) => {
                  newGroups[g] = { color: this.getRandomColor() };
                });
                parsed.groups = newGroups;
                this.saveGroupsData(parsed);
              }
              return parsed;
            }
            return { groups: {}, villageGroups: {}, playerGroups: {} };
          } catch (e) {
            return { groups: {}, villageGroups: {}, playerGroups: {} };
          }
        }
        static getRandomColor() {
          const r = Math.floor(Math.random() * 256);
          const g = Math.floor(Math.random() * 256);
          const b = Math.floor(Math.random() * 256);
          return `rgba(${r}, ${g}, ${b}, 0.4)`;
        }
        static saveGroupsData(data) {
          localStorage.setItem(this.GROUPS_KEY, JSON.stringify(data));
        }
        static addGroup(groupName) {
          const data = this.getGroupsData();
          if (!data.groups[groupName]) {
            data.groups[groupName] = { color: this.getRandomColor() };
            this.saveGroupsData(data);
          }
        }
        static setVillageGroup(villageId, groupName) {
          const data = this.getGroupsData();
          if (groupName) {
            data.villageGroups[villageId] = groupName;
          } else {
            delete data.villageGroups[villageId];
          }
          this.saveGroupsData(data);
        }
        static addPlayerToGroup(playerName, groupName) {
          const data = this.getGroupsData();
          if (!data.playerGroups[playerName]) {
            data.playerGroups[playerName] = [];
          }
          if (!data.playerGroups[playerName].includes(groupName)) {
            data.playerGroups[playerName].push(groupName);
            this.saveGroupsData(data);
          }
        }
        static getVillageGroup(villageId) {
          return this.getGroupsData().villageGroups[villageId] || null;
        }
      };
    }
  });

  // src/core/classifier.ts
  var Classifier;
  var init_classifier = __esm({
    "src/core/classifier.ts"() {
      "use strict";
      init_storage();
      Classifier = class {
        static getVillageStatus(villageId) {
          const data = StorageService.getVillageData(villageId);
          return data ? data.status : "NONE";
        }
        static setVillageStatus(villageId, status) {
          StorageService.setVillageStatus(villageId, status);
        }
      };
    }
  });

  // src/core/geometry.ts
  var Geometry;
  var init_geometry = __esm({
    "src/core/geometry.ts"() {
      "use strict";
      Geometry = class {
        /**
         * Computes the convex hull of a set of 2D points.
         * Uses the Monotone Chain algorithm.
         */
        static getConvexHull(points) {
          if (points.length <= 3) return points;
          const sorted = [...points].sort((a, b) => a.x !== b.x ? a.x - b.x : a.y - b.y);
          const cross = (o, a, b) => {
            return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
          };
          const lower = [];
          for (const p of sorted) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
              lower.pop();
            }
            lower.push(p);
          }
          const upper = [];
          for (let i = sorted.length - 1; i >= 0; i--) {
            const p = sorted[i];
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
              upper.pop();
            }
            upper.push(p);
          }
          upper.pop();
          lower.pop();
          return lower.concat(upper);
        }
      };
    }
  });

  // src/ui/overlay.ts
  var Overlay;
  var init_overlay = __esm({
    "src/ui/overlay.ts"() {
      "use strict";
      init_classifier();
      init_storage();
      init_geometry();
      Overlay = class {
        static overlays = {};
        static polygons = {};
        static container;
        static svgContainer;
        static initialized = false;
        static init() {
          if (this.initialized) return;
          this.initialized = true;
          this.container = document.createElement("div");
          this.container.id = "map_custom_overlay_container";
          this.container.style.position = "absolute";
          this.container.style.top = "0";
          this.container.style.left = "0";
          this.container.style.width = "100%";
          this.container.style.height = "100%";
          this.container.style.pointerEvents = "none";
          this.container.style.zIndex = "10";
          this.svgContainer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          this.svgContainer.style.position = "absolute";
          this.svgContainer.style.top = "0";
          this.svgContainer.style.left = "0";
          this.svgContainer.style.width = "100%";
          this.svgContainer.style.height = "100%";
          this.svgContainer.style.pointerEvents = "none";
          this.svgContainer.style.zIndex = "0";
          this.container.appendChild(this.svgContainer);
          const mapMover = document.getElementById("map_container") || document.getElementById("map") || document.querySelector(".map_container") || document.body;
          if (mapMover) {
            mapMover.appendChild(this.container);
          }
          const loop = () => {
            this.updateOverlays();
            requestAnimationFrame(loop);
          };
          requestAnimationFrame(loop);
        }
        static updateOverlays() {
          if (!this.initialized) return;
          if (typeof TWMap !== "undefined" && TWMap.map && TWMap.map.el) {
            const mapEl = TWMap.map.el instanceof HTMLElement ? TWMap.map.el : TWMap.map.el[0] || document.getElementById("map");
            if (mapEl && this.container.parentElement !== mapEl) {
              mapEl.appendChild(this.container);
              this.container.style.position = "absolute";
              this.container.style.left = "0";
              this.container.style.top = "0";
              this.container.style.width = "100%";
              this.container.style.height = "100%";
              this.container.style.zIndex = "50000";
              this.container.style.pointerEvents = "none";
            }
          }
          if (typeof TWMap === "undefined" || !TWMap.villages) {
            return;
          }
          const currentMapIds = /* @__PURE__ */ new Set();
          for (const id in TWMap.villages) {
            const v = TWMap.villages[id];
            const status = Classifier.getVillageStatus(id);
            if (status !== "NONE") {
              currentMapIds.add(id);
              this.drawOverlay(id, v, status);
            } else if (this.overlays[id]) {
              this.removeOverlay(id);
            }
          }
          for (const id in this.overlays) {
            if (!currentMapIds.has(id)) {
              this.removeOverlay(id);
            }
          }
          const groupsData = StorageService.getGroupsData();
          const groupVillages = {};
          for (const villageId in groupsData.villageGroups) {
            const groupName = groupsData.villageGroups[villageId];
            if (!groupVillages[groupName]) {
              groupVillages[groupName] = [];
            }
            groupVillages[groupName].push(villageId);
          }
          const activeGroups = /* @__PURE__ */ new Set();
          for (const groupName in groupVillages) {
            activeGroups.add(groupName);
            const villages = groupVillages[groupName] || [];
            const color = groupsData.groups[groupName]?.color || "rgba(255, 255, 255, 0.4)";
            let points = [];
            for (const id of villages) {
              const xyId = parseInt(id, 10);
              if (!isNaN(xyId) && TWMap.map && TWMap.map.pos) {
                const x = Math.floor(xyId / 1e3);
                const y = xyId % 1e3;
                const pixelX = x * TWMap.tileSize[0] - TWMap.map.pos[0];
                const pixelY = y * TWMap.tileSize[1] - TWMap.map.pos[1];
                const p = 5;
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
        static drawOverlay(id, village, status) {
          let el = this.overlays[id];
          if (!el) {
            el = document.createElement("div");
            el.className = "map_custom_marker";
            el.style.position = "absolute";
            el.style.width = TWMap.tileSize[0] + "px";
            el.style.height = TWMap.tileSize[1] + "px";
            el.style.display = "flex";
            el.style.alignItems = "center";
            el.style.justifyContent = "center";
            el.style.fontWeight = "bold";
            el.style.fontSize = "24px";
            el.style.textShadow = "0px 0px 3px black";
            el.style.zIndex = "50000";
            el.style.pointerEvents = "none";
            this.container.appendChild(el);
            this.overlays[id] = el;
          }
          if (el) {
            const xyId = parseInt(id, 10);
            if (isNaN(xyId)) {
              return;
            }
            const x = Math.floor(xyId / 1e3);
            const y = xyId % 1e3;
            if (TWMap.map && TWMap.map.pos) {
              const pixelX = x * TWMap.tileSize[0] - TWMap.map.pos[0];
              const pixelY = y * TWMap.tileSize[1] - TWMap.map.pos[1];
              el.style.left = pixelX + "px";
              el.style.top = pixelY + "px";
            }
            if (status === "OFF") {
              el.innerHTML = "\u2694\uFE0F";
              el.style.backgroundColor = "rgba(255, 0, 0, 0.3)";
              el.style.border = "2px solid red";
            } else if (status === "DEF") {
              el.innerHTML = "\u{1F6E1}\uFE0F";
              el.style.backgroundColor = "rgba(0, 0, 255, 0.3)";
              el.style.border = "2px solid blue";
            }
          }
        }
        static removeOverlay(id) {
          const el = this.overlays[id];
          if (el && el.parentElement) {
            el.parentElement.removeChild(el);
          }
          delete this.overlays[id];
        }
        static drawGroupPolygon(groupName, hull, color) {
          let poly = this.polygons[groupName];
          if (!poly) {
            poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            poly.style.pointerEvents = "none";
            this.svgContainer.appendChild(poly);
            this.polygons[groupName] = poly;
          }
          const pointsStr = hull.map((p) => `${p.x},${p.y}`).join(" ");
          poly.setAttribute("points", pointsStr);
          poly.setAttribute("fill", color);
          poly.setAttribute("stroke", color.replace(/[\d.]+\)$/, "0.8)"));
          poly.setAttribute("stroke-width", "2");
          poly.setAttribute("stroke-linejoin", "round");
        }
      };
    }
  });

  // src/ui/panel.ts
  var Panel;
  var init_panel = __esm({
    "src/ui/panel.ts"() {
      "use strict";
      init_classifier();
      init_storage();
      Panel = class {
        element;
        currentVillageId = null;
        onStatusChangeCallback = null;
        constructor() {
          this.element = document.createElement("div");
          this.element.id = "map_custom_panel_element";
          this.element.style.position = "absolute";
          this.element.style.display = "none";
          this.element.style.zIndex = "100000";
          this.element.style.background = "#e3d5b8";
          this.element.style.border = "2px solid #804000";
          this.element.style.borderRadius = "5px";
          this.element.style.padding = "5px";
          this.element.style.boxShadow = "0 2px 5px rgba(0,0,0,0.5)";
          this.element.innerHTML = `
            <div style="margin-bottom: 5px; font-weight: bold; text-align: center; color: #4a2100;">Set Status</div>
            <button id="btn_c_off" style="background: #ffcccc; border: 1px solid #cc0000; color: #cc0000; font-weight: bold; padding: 3px 8px; cursor: pointer;">OFF \u2694\uFE0F</button>
            <button id="btn_c_def" style="background: #ccccff; border: 1px solid #0000cc; color: #0000cc; font-weight: bold; padding: 3px 8px; cursor: pointer;">DEF \u{1F6E1}\uFE0F</button>
            <button id="btn_c_none" style="background: #e0e0e0; border: 1px solid #666; color: #333; padding: 3px 8px; cursor: pointer;">Clear</button>
            <button id="btn_c_close" style="background: transparent; border: none; font-weight: bold; cursor: pointer; float: right; color: #888;">X</button>
            
            <div style="border-top: 1px solid #804000; margin-top: 5px; padding-top: 5px;">
                <div style="font-weight: bold; text-align: center; color: #4a2100;">Groups</div>
                
                <div style="margin-top: 3px; margin-bottom: 5px;">
                    <select id="village_group_select" style="width: 100%; padding: 2px;">
                        <option value="">-- Assign Village --</option>
                    </select>
                </div>

                <div style="margin-top: 5px; display: flex;">
                    <input type="text" id="new_group_input" placeholder="New group" style="flex: 1; width: 0; padding: 2px;">
                    <button id="btn_create_group" style="cursor: pointer; background: #ccffcc; border: 1px solid #00cc00; margin-left: 2px; font-weight: bold;">\u2705</button>
                </div>
                
                <div id="player_group_container" style="display: none; margin-top: 5px;">
                    <div style="font-size: 10px; color: #4a2100; margin-bottom: 2px;">Assign player to group:</div>
                    <select id="player_name_select" style="width: 100%; padding: 2px; margin-bottom: 2px;"></select>
                </div>

                <div style="margin-top: 10px; text-align: center; border-top: 1px dashed #804000; padding-top: 5px;">
                    <div style="display: flex; gap: 5px;">
                        <button id="btn_export_bbcode" style="cursor: pointer; flex: 1; padding: 3px; background: #e0e0e0; border: 1px solid #666; color: #333; font-weight: bold;">Export BBCode</button>
                        <button id="btn_export_text" style="cursor: pointer; flex: 1; padding: 3px; background: #e0e0e0; border: 1px solid #666; color: #333; font-weight: bold;">Export Texto</button>
                    </div>
                    <textarea id="bbcode_export_area" style="display: none; width: 100%; height: 60px; margin-top: 5px; font-size: 10px; resize: vertical;" readonly></textarea>
                </div>
            </div>
        `;
          document.body.appendChild(this.element);
          this.element.querySelector("#btn_c_off")?.addEventListener("click", () => this.setStatus("OFF"));
          this.element.querySelector("#btn_c_def")?.addEventListener("click", () => this.setStatus("DEF"));
          this.element.querySelector("#btn_c_none")?.addEventListener("click", () => this.setStatus("NONE"));
          this.element.querySelector("#btn_c_close")?.addEventListener("click", () => this.hide());
          this.element.querySelector("#btn_create_group")?.addEventListener("click", () => {
            const input = this.element.querySelector("#new_group_input");
            const groupName = input.value.trim();
            if (groupName) {
              StorageService.addGroup(groupName);
              input.value = "";
              this.updateGroupSelects();
              const playerContainer = this.element.querySelector("#player_group_container");
              playerContainer.style.display = "block";
              const villageSelect = this.element.querySelector("#village_group_select");
              villageSelect.value = groupName;
              if (this.currentVillageId) {
                StorageService.setVillageGroup(this.currentVillageId, groupName);
              }
            }
          });
          this.element.querySelector("#player_name_select")?.addEventListener("change", (e) => {
            const select = e.target;
            const playerName = select.value;
            const villageSelect = this.element.querySelector("#village_group_select");
            const currentGroup = villageSelect.value;
            if (playerName && currentGroup) {
              StorageService.addPlayerToGroup(playerName, currentGroup);
            }
          });
          this.element.querySelector("#village_group_select")?.addEventListener("change", (e) => {
            const select = e.target;
            const groupName = select.value;
            if (this.currentVillageId) {
              StorageService.setVillageGroup(this.currentVillageId, groupName);
            }
          });
          const handleExport = (isBBCode) => {
            const groupsData = StorageService.getGroupsData();
            const statusData = StorageService.getAllData();
            const lines = [];
            if (isBBCode) {
              lines.push("[table]\n[**]Jugador[||]Coordenadas[||]Grupo[||]Estado[/**]");
            } else {
              lines.push("Jugador	Coordenadas	Grupo	Estado");
            }
            for (const [villageId, groupName] of Object.entries(groupsData.villageGroups)) {
              const xyId = parseInt(villageId, 10);
              if (isNaN(xyId)) continue;
              const x = Math.floor(xyId / 1e3);
              const y = xyId % 1e3;
              const coord = `${x}|${y}`;
              let playerName = "Desconocido";
              if (typeof TWMap !== "undefined" && TWMap.villages && TWMap.villages[villageId]) {
                const ownerId = TWMap.villages[villageId].owner;
                if (ownerId && TWMap.players && TWMap.players[ownerId]) {
                  playerName = TWMap.players[ownerId].name;
                }
              }
              const statusInfo = statusData[villageId];
              const tipoJuego = statusInfo ? statusInfo.status : "NONE";
              if (isBBCode) {
                lines.push(`[*][player]${playerName}[/player][|][coord]${coord}[/coord][|]${groupName}[|]${tipoJuego}`);
              } else {
                lines.push(`${playerName}	${coord}	${groupName}	${tipoJuego}`);
              }
            }
            if (isBBCode) {
              lines.push("[/table]");
            }
            const textarea = this.element.querySelector("#bbcode_export_area");
            textarea.value = lines.length > (isBBCode ? 2 : 1) ? lines.join("\n") : "No hay pueblos asignados a ning\xFAn grupo.";
            textarea.style.display = "block";
            textarea.select();
          };
          this.element.querySelector("#btn_export_bbcode")?.addEventListener("click", () => handleExport(true));
          this.element.querySelector("#btn_export_text")?.addEventListener("click", () => handleExport(false));
        }
        onStatusChange(callback) {
          this.onStatusChangeCallback = callback;
        }
        setStatus(status) {
          if (this.currentVillageId) {
            Classifier.setVillageStatus(this.currentVillageId, status);
            if (this.onStatusChangeCallback) {
              this.onStatusChangeCallback(this.currentVillageId, status);
            }
            this.hide();
          }
        }
        getPlayersFromStorage() {
          if (typeof TWMap === "undefined") return [];
          const data = StorageService.getAllData();
          const playersMap = {};
          for (const villageId of Object.keys(data)) {
            const village = TWMap.villages[villageId];
            if (village && village.owner && TWMap.players[village.owner]) {
              playersMap[village.owner] = TWMap.players[village.owner].name;
            }
          }
          return Object.keys(playersMap).map((id) => ({ id, name: playersMap[id] }));
        }
        updateGroupSelects() {
          const groupsData = StorageService.getGroupsData();
          const villageSelect = this.element.querySelector("#village_group_select");
          const currentVillageVal = villageSelect.value;
          villageSelect.innerHTML = '<option value="">-- Assign Village --</option>';
          Object.keys(groupsData.groups).forEach((g) => {
            const opt = document.createElement("option");
            opt.value = g;
            opt.textContent = g;
            villageSelect.appendChild(opt);
          });
          if (currentVillageVal && groupsData.groups[currentVillageVal]) {
            villageSelect.value = currentVillageVal;
          }
          const playerSelect = this.element.querySelector("#player_name_select");
          playerSelect.innerHTML = '<option value="">-- Select Player --</option>';
          const players = this.getPlayersFromStorage();
          players.forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.name;
            opt.textContent = p.name;
            playerSelect.appendChild(opt);
          });
        }
        show(villageId, x, y) {
          this.currentVillageId = villageId;
          this.updateGroupSelects();
          const villageGroup = StorageService.getVillageGroup(villageId);
          const villageSelect = this.element.querySelector("#village_group_select");
          villageSelect.value = villageGroup || "";
          const playerContainer = this.element.querySelector("#player_group_container");
          playerContainer.style.display = "none";
          const textarea = this.element.querySelector("#bbcode_export_area");
          textarea.style.display = "none";
          textarea.value = "";
          const legend = document.getElementById("map_legend");
          if (legend) {
            const rect = legend.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            this.element.style.top = `${rect.top + scrollTop}px`;
            this.element.style.left = `${rect.right + scrollLeft + 15}px`;
          } else {
            this.element.style.left = `${x}px`;
            this.element.style.top = `${y}px`;
          }
          this.element.style.display = "block";
        }
        hide() {
          this.element.style.display = "none";
          this.currentVillageId = null;
        }
      };
    }
  });

  // src/dashboard/Scraper.ts
  var Scraper;
  var init_Scraper = __esm({
    "src/dashboard/Scraper.ts"() {
      "use strict";
      Scraper = class {
        players = {};
        filters = {};
        constructor() {
          this.loadFilters();
        }
        getFilters() {
          return this.filters;
        }
        saveFilters(filters) {
          this.filters = filters;
          localStorage.troopCounterFilter = JSON.stringify(this.filters);
        }
        addFilter(variable, kind, value) {
          if (!this.filters[variable]) {
            this.filters[variable] = [];
          }
          this.filters[variable].push([kind, value]);
          this.saveFilters(this.filters);
        }
        removeFilter(variable, index) {
          if (this.filters[variable]) {
            this.filters[variable].splice(index, 1);
            if (this.filters[variable].length === 0) {
              delete this.filters[variable];
            }
            this.saveFilters(this.filters);
          }
        }
        loadFilters() {
          if (localStorage.troopCounterFilter) {
            try {
              this.filters = JSON.parse(localStorage.troopCounterFilter);
            } catch (e) {
              this.filters = {};
            }
          }
        }
        getPlayerDict() {
          let playerDict = {};
          const now = (/* @__PURE__ */ new Date()).getTime();
          const server = window.location.host;
          if (localStorage.playerDictFake) {
            const parts = localStorage.playerDictFake.split(":::");
            if (parts[0] === server) {
              const savedDate = parseInt(parts[1], 10);
              if (now - savedDate < 1e3 * 60 * 60) {
                try {
                  playerDict = JSON.parse(parts[2]);
                  this.players = playerDict;
                  return playerDict;
                } catch (e) {
                }
              }
            }
          }
          const playerUrl = "https://" + window.location.host + "/map/player.txt";
          const request = new XMLHttpRequest();
          request.open("GET", playerUrl, false);
          request.send(null);
          if (request.status === 200 && request.responseText) {
            const playerList = request.responseText.split("\n");
            for (let i = 0; i < playerList.length; i++) {
              const rowStr = playerList[i];
              if (rowStr && rowStr !== "") {
                const row = rowStr.split(",");
                if (row.length >= 2 && row[0] && row[1]) {
                  playerDict[row[0]] = decodeURIComponent(row[1].replace(/\+/g, " "));
                }
              }
            }
            localStorage.playerDictFake = server + ":::" + now + ":::" + JSON.stringify(playerDict);
          }
          this.players = playerDict;
          return playerDict;
        }
        readData(mode, onProgress, onComplete) {
          if (game_data.mode !== "members" && game_data.mode !== "members_troops" && game_data.mode !== "members_defense" && game_data.mode !== "members_buildings") {
            UI.ErrorMessage("You must be on the Ally Members page to run this.", 3e3);
            return;
          }
          const tables = document.getElementsByClassName("vis");
          console.log(`[Scraper] Tablas con clase 'vis' en el DOM: ${tables.length}`);
          let membersTable = null;
          for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            if (table && table.innerHTML && table.innerHTML.includes("player_id=")) {
              membersTable = table;
              console.log(`[Scraper] Tabla de miembros encontrada en \xEDndice ${i}`);
              break;
            }
          }
          if (!membersTable) {
            console.error("[Scraper] No se encontr\xF3 ninguna tabla con player_id=. Tablas disponibles:", Array.from(tables).map((t, i) => `[${i}] ${t.className}`));
            UI.ErrorMessage("Could not find members table.", 3e3);
            return;
          }
          const playerInfoList = [];
          const rows = membersTable.rows;
          console.log(`[Scraper] Filas en la tabla de miembros: ${rows.length}`);
          for (let i = 1; i < rows.length - 1; i++) {
            const rowEl = rows[i];
            if (!rowEl) continue;
            const rowHtml = rowEl.innerHTML;
            const playerIdMatch = rowHtml.match(/player_id=(\d+)/);
            if (playerIdMatch && playerIdMatch[1]) {
              const playerId = playerIdMatch[1];
              let villageAmount = 1;
              if (rowEl.cells && rowEl.cells.length >= 5) {
                const cell = rowEl.cells[4];
                if (cell) {
                  const cellContent = cell.textContent || "";
                  const parsed = parseInt(cellContent.trim(), 10);
                  if (!isNaN(parsed)) {
                    villageAmount = parsed;
                  }
                }
              }
              console.log(`[Scraper] Fila ${i} -> playerId: ${playerId}, villageAmount: ${villageAmount}`);
              playerInfoList.push({ playerId, villageAmount });
            } else {
              console.warn(`[Scraper] Fila ${i}: no se encontr\xF3 player_id. HTML:`, rowHtml.substring(0, 200));
            }
          }
          if (playerInfoList.length === 0) {
            console.error("[Scraper] playerInfoList vac\xEDo. No se encontraron miembros.");
            UI.ErrorMessage("No members found.", 3e3);
            return;
          }
          console.log(`[Scraper] Total jugadores a procesar: ${playerInfoList.length}`, playerInfoList);
          let csvData = "Coords,Player,Points,";
          let headersList = [];
          let displayHeadersList = [];
          if (mode === "members_buildings") {
            headersList = ["main", "barracks", "stable", "garage", "snob", "smith", "place", "statue", "market", "wood", "stone", "iron", "farm", "storage", "hide", "wall"];
            displayHeadersList = ["Edificio Principal", "Cuartel", "Cuadra", "Taller", "Corte", "Herrer\xEDa", "Plaza de reuniones", "Estatua", "Mercado", "Le\xF1ador", "Barrera", "Mina de hierro", "Granja", "Almac\xE9n", "Escondrijo", "Muralla"];
          } else {
            headersList = game_data.units || ["spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "knight", "snob"];
            displayHeadersList = headersList;
          }
          for (let k = 0; k < displayHeadersList.length; k++) {
            csvData += displayHeadersList[k] + (k === displayHeadersList.length - 1 ? "" : ",");
          }
          csvData += "\n";
          const players = this.getPlayerDict();
          let currentIndex = 0;
          let pageNumber = 1;
          const loop = () => {
            if (currentIndex >= playerInfoList.length) {
              console.log("[Scraper] Todos los jugadores procesados. Generando CSV.");
              onProgress(1);
              onComplete(csvData);
              return;
            }
            const currentPlayer = playerInfoList[currentIndex];
            if (!currentPlayer) {
              currentIndex++;
              setTimeout(loop, 200);
              return;
            }
            const url = `https://${window.location.host}/game.php?screen=ally&mode=${mode}&player_id=${currentPlayer.playerId}&page=${pageNumber}`;
            console.log(`[Scraper] [${currentIndex + 1}/${playerInfoList.length}] Fetching playerId=${currentPlayer.playerId}, p\xE1gina=${pageNumber} -> ${url}`);
            $.ajax({
              url,
              success: (result) => {
                onProgress(currentIndex / playerInfoList.length);
                const parser = new DOMParser();
                const doc = parser.parseFromString(result, "text/html");
                const visTables = doc.querySelectorAll("table.vis.w100");
                console.log(`[Scraper] playerId=${currentPlayer.playerId}: tablas 'vis w100' en respuesta: ${visTables.length}`);
                let dataTable = null;
                if (visTables.length > 0) {
                  dataTable = visTables[visTables.length - 1];
                }
                if (!dataTable) {
                  console.warn(`[Scraper] playerId=${currentPlayer.playerId}: no se encontr\xF3 tabla de datos. Fragmento HTML:`, result.substring(0, 600));
                }
                if (dataTable) {
                  const trs = dataTable.querySelectorAll("tr");
                  let step = mode === "members_defense" ? 2 : 1;
                  let startRow = 1;
                  if (trs.length > 1 && trs[1] && trs[1].querySelector("th")) {
                    startRow = 2;
                  }
                  console.log(`[Scraper] playerId=${currentPlayer.playerId}: filas en tabla=${trs.length}, startRow=${startRow}, step=${step}`);
                  for (let j = startRow; j + step - 1 < trs.length; j += step) {
                    const row = trs[j];
                    if (!row || row.querySelector("th")) continue;
                    let villageData = {};
                    const textContent = row.textContent || "";
                    const coordMatch = textContent.match(/\((\d{1,3})\|(\d{1,3})\)/);
                    if (coordMatch) {
                      villageData["x"] = coordMatch[1];
                      villageData["y"] = coordMatch[2];
                    } else {
                      console.warn(`[Scraper] Fila ${j}: sin coordenadas. Texto: "${textContent.trim().substring(0, 80)}"`);
                      villageData["x"] = "0";
                      villageData["y"] = "0";
                    }
                    const tds = row.querySelectorAll("td");
                    if (tds && tds.length >= 2) {
                      const cell1 = tds[1];
                      if (cell1) {
                        const pointsText = cell1.textContent || "0";
                        villageData["points"] = pointsText.replace(/\./g, "").trim();
                      } else {
                        villageData["points"] = "0";
                      }
                    } else {
                      villageData["points"] = "0";
                    }
                    if (mode === "members_buildings") {
                      for (let k = 0; k < headersList.length; k++) {
                        const headerKey = headersList[k];
                        if (!headerKey) continue;
                        const cellIndex = k + 2;
                        if (tds && tds.length > cellIndex) {
                          const cell = tds[cellIndex];
                          if (cell) {
                            let val = cell.textContent?.trim() || "0";
                            if (cell.classList.contains("hidden")) {
                              val = "0";
                            }
                            villageData[headerKey] = val;
                          } else {
                            villageData[headerKey] = "0";
                          }
                        } else {
                          villageData[headerKey] = "0";
                        }
                      }
                    } else {
                      for (let k = 0; k < headersList.length; k++) {
                        const headerKey = headersList[k];
                        if (!headerKey) continue;
                        const cellIndex = k + 2;
                        let unitData = "0";
                        if (tds && tds.length > cellIndex) {
                          const cell = tds[cellIndex];
                          if (cell && !cell.classList.contains("hidden")) {
                            unitData = cell.textContent?.trim() || "0";
                          }
                        }
                        villageData[headerKey] = unitData;
                      }
                    }
                    let passedFilter = true;
                    for (const key in this.filters) {
                      for (let k = 0; k < this.filters[key].length; k++) {
                        const filterItem = this.filters[key][k];
                        if (!filterItem) continue;
                        const operator = filterItem[0];
                        const filterVal = parseInt(filterItem[1], 10);
                        const actualVal = parseInt(villageData[key] || "0", 10);
                        if (operator === ">" && actualVal <= filterVal) {
                          passedFilter = false;
                          break;
                        } else if (operator === "<" && actualVal >= filterVal) {
                          passedFilter = false;
                          break;
                        }
                      }
                      if (!passedFilter) break;
                    }
                    if (passedFilter) {
                      const playerName = players[currentPlayer.playerId] || "Unknown";
                      const row2 = `${villageData["x"]}|${villageData["y"]},${playerName},${villageData["points"]},` + headersList.map((item) => item ? villageData[item] || "0" : "0").join(",") + "\n";
                      console.log(`[Scraper] Fila a\xF1adida al CSV:`, row2.trim());
                      csvData += row2;
                    } else {
                      console.log(`[Scraper] Fila ${j} descartada por filtros. villageData:`, villageData);
                    }
                  }
                }
                if (currentPlayer.villageAmount / 1e3 > pageNumber) {
                  console.log(`[Scraper] playerId=${currentPlayer.playerId}: hay m\xE1s p\xE1ginas (villageAmount=${currentPlayer.villageAmount}), cargando p\xE1gina ${pageNumber + 1}`);
                  pageNumber++;
                } else {
                  currentIndex++;
                  pageNumber = 1;
                }
                setTimeout(loop, 200);
              },
              error: (_jqXHR, textStatus, errorThrown) => {
                console.error(`[Scraper] Error AJAX para playerId=${currentPlayer.playerId}, p\xE1gina=${pageNumber}: ${textStatus} - ${errorThrown}`);
                currentIndex++;
                pageNumber = 1;
                setTimeout(loop, 200);
              }
            });
          };
          loop();
        }
      };
    }
  });

  // src/dashboard/Dashboard.ts
  var Dashboard;
  var init_Dashboard = __esm({
    "src/dashboard/Dashboard.ts"() {
      "use strict";
      init_Scraper();
      Dashboard = class {
        scraper;
        mode = "members_troops";
        constructor() {
          this.scraper = new Scraper();
          this.initMode();
        }
        initMode() {
          if (localStorage.troopCounterMode) {
            this.mode = localStorage.troopCounterMode;
          }
        }
        setMode(mode) {
          this.mode = mode;
          localStorage.troopCounterMode = mode;
        }
        render() {
          const filters = this.scraper.getFilters();
          let filterTableRows = "";
          for (const variable in filters) {
            const fList = filters[variable];
            if (fList) {
              fList.forEach((f, idx) => {
                filterTableRows += `
                        <tr>
                            <td>${variable}</td>
                            <td>${f[0]}</td>
                            <td>${f[1]}</td>
                            <td>
                                <input type="image" src="https://dsit.innogamescdn.com/asset/cbd6f76/graphic/delete.png" 
                                     class="tw-delete-filter" data-var="${variable}" data-idx="${idx}" alt="Delete">
                            </td>
                        </tr>
                    `;
              });
            }
          }
          const unitsList = game_data.units || ["spear", "sword", "axe", "archer", "spy", "light", "marcher", "heavy", "ram", "catapult", "knight", "snob"];
          const variablesList = ["x", "y", "points", ...unitsList, "main", "barracks", "stable", "garage", "snob", "smith", "place", "statue", "market", "wood", "stone", "iron", "farm", "storage", "hide", "wall"];
          let unitOptions = variablesList.map((u) => `<option value="${u}">${u}</option>`).join("");
          const html = `
            <div>
                <fieldset>
                    <legend>Ajustes</legend>
                    <p><label><input type="radio" name="tw-dash-mode" value="members_troops" ${this.mode === "members_troops" ? "checked" : ""}> Leer tropas de la aldea</label></p>
                    <p><label><input type="radio" name="tw-dash-mode" value="members_defense" ${this.mode === "members_defense" ? "checked" : ""}> Leer defensas en la aldea</label></p>
                    <p><label><input type="radio" name="tw-dash-mode" value="members_buildings" ${this.mode === "members_buildings" ? "checked" : ""}> Leer edificios</label></p>
                </fieldset>
                <fieldset>
                    <legend>Filtros</legend>
                    <select id="tw-dash-var">${unitOptions}</select>
                    <select id="tw-dash-op">
                        <option value=">">&gt;</option>
                        <option value="<">&lt;</option>
                    </select>
                    <input type="text" id="tw-dash-val">
                    <input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="tw-dash-add-filter" value="Guardar filtro">
                    <p>
                        <table class="vis" style="width: 100%;">
                            <tr>
                                <th>Variable</th>
                                <th>Operador</th>
                                <th>Valor</th>
                                <th></th>
                            </tr>
                            ${filterTableRows}
                        </table>
                    </p>
                </fieldset>
                <div>
                    <p><input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="tw-dash-run" value="Extraer datos"></p>
                </div>
            </div>
        `;
          Dialog.show("Dashboard", html);
          this.attachEvents();
        }
        attachEvents() {
          setTimeout(() => {
            const radios = document.querySelectorAll('input[name="tw-dash-mode"]');
            radios.forEach((r) => r.addEventListener("change", (e) => {
              if (e.target.checked) {
                this.setMode(e.target.value);
              }
            }));
            const addFilterBtn = document.getElementById("tw-dash-add-filter");
            if (addFilterBtn) {
              addFilterBtn.addEventListener("click", () => {
                const variable = document.getElementById("tw-dash-var").value;
                const op = document.getElementById("tw-dash-op").value;
                const val = document.getElementById("tw-dash-val").value;
                if (val && !isNaN(Number(val))) {
                  this.scraper.addFilter(variable, op, val);
                  this.render();
                } else {
                  UI.ErrorMessage("Introduce un valor num\xE9rico v\xE1lido.", 3e3);
                }
              });
            }
            const deleteBtns = document.querySelectorAll(".tw-delete-filter");
            deleteBtns.forEach((btn) => {
              btn.addEventListener("click", (e) => {
                const target = e.target;
                const variable = target.getAttribute("data-var");
                const idxStr = target.getAttribute("data-idx");
                if (variable && idxStr) {
                  const idx = parseInt(idxStr, 10);
                  this.scraper.removeFilter(variable, idx);
                  this.render();
                }
              });
            });
            const runBtn = document.getElementById("tw-dash-run");
            if (runBtn) {
              runBtn.addEventListener("click", () => {
                this.startScraping();
              });
            }
          }, 100);
        }
        startScraping() {
          const html = '<label> Extrayendo... </label><progress id="tw-dash-bar" max="1" value="0" style="width: 100%;"></progress>';
          Dialog.show("Progreso", html);
          this.scraper.readData(
            this.mode,
            (progress) => {
              const bar = document.getElementById("tw-dash-bar");
              if (bar) bar.value = progress;
            },
            (csvData) => {
              this.showData(csvData);
            }
          );
        }
        showData(data) {
          const html = `
            <p><h2>Datos de la tribu</h2>Modo seleccionado: ${this.mode}</p>
            <p><textarea readonly=true style="width: 100%; height: 200px;">${data}</textarea></p>
            <p>
                <input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="tw-dash-download" value="Descargar como CSV">
                <input type="button" class="btn evt-confirm-btn btn-confirm-no" id="tw-dash-back" value="Volver al men\xFA principal">
            </p>
        `;
          Dialog.show("Datos de la tribu", html);
          setTimeout(() => {
            const downloadBtn = document.getElementById("tw-dash-download");
            if (downloadBtn) {
              downloadBtn.addEventListener("click", () => {
                this.downloadCSV("tribe_info", data);
              });
            }
            const backBtn = document.getElementById("tw-dash-back");
            if (backBtn) {
              backBtn.addEventListener("click", () => {
                this.render();
              });
            }
          }, 100);
        }
        downloadCSV(filename, text) {
          const element = document.createElement("a");
          element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(text));
          element.setAttribute("download", filename + ".csv");
          element.style.display = "none";
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
        }
      };
    }
  });

  // src/index.ts
  var require_index = __commonJS({
    "src/index.ts"() {
      init_map();
      init_overlay();
      init_panel();
      init_Dashboard();
      function initMap() {
        MapCore.init();
        Overlay.init();
        const panel = new Panel();
        if (typeof TWMap !== "undefined" && TWMap.mapHandler) {
          const originalOnClick = TWMap.mapHandler.onClick;
          TWMap.mapHandler.onClick = function(x, y, event) {
            const villageId = MapCore.getVillageIdAt(x, y);
            if (villageId) {
              panel.show(villageId, event.pageX, event.pageY);
              if (event.shiftKey) {
                return false;
              }
            } else {
              panel.hide();
            }
            if (originalOnClick) {
              return originalOnClick.apply(this, arguments);
            }
            return true;
          };
        } else {
          const mapMover = document.getElementById("map_mover") || document.getElementById("map");
          if (mapMover) {
            mapMover.addEventListener("click", (e) => {
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
        const screen = searchParams.get("screen");
        const mode = searchParams.get("mode");
        if (screen === "map") {
          initMap();
        } else if (screen === "ally" && mode && mode.startsWith("members")) {
          initDashboard();
        }
      }
      if (document.readyState === "complete") {
        init();
      } else {
        window.addEventListener("load", () => {
          setTimeout(init, 1e3);
        });
      }
    }
  });
  require_index();
})();
