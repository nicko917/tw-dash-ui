import { Scraper } from './Scraper';
import type { ReadResult } from './Scraper';

declare const game_data: any;
declare const Dialog: any;
declare const UI: any;
export class Dashboard {
    private scraper: Scraper;
    private mode: string = 'members_troops';
    private lastReadResult: ReadResult | null = null;

    constructor() {
        this.scraper = new Scraper();
        this.initMode();
    }

    private initMode() {
        if (localStorage.troopCounterMode) {
            this.mode = localStorage.troopCounterMode;
        }
    }

    private setMode(mode: string) {
        this.mode = mode;
        localStorage.troopCounterMode = mode;
    }

    public render() {
        const filters = this.scraper.getFilters();
        let filterTableRows = '';
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

        const unitsList = game_data.units || ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];
        const variablesList = ['x', 'y', 'points', ...unitsList, 'main', 'barracks', 'stable', 'garage', 'snob', 'smith', 'place', 'statue', 'market', 'wood', 'stone', 'iron', 'farm', 'storage', 'hide', 'wall'];
        let unitOptions = variablesList.map(u => `<option value="${u}">${u}</option>`).join('');

        const html = `
            <div>
                <fieldset>
                    <legend>Ajustes</legend>
                    <p><label><input type="radio" name="tw-dash-mode" value="members_troops" ${this.mode === 'members_troops' ? 'checked' : ''}> Leer tropas de la aldea</label></p>
                    <p><label><input type="radio" name="tw-dash-mode" value="members_defense" ${this.mode === 'members_defense' ? 'checked' : ''}> Leer defensas en la aldea</label></p>
                    <p><label><input type="radio" name="tw-dash-mode" value="members_buildings" ${this.mode === 'members_buildings' ? 'checked' : ''}> Leer edificios</label></p>
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
                    <p>
                        <input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="tw-dash-run" value="Extraer datos CSV">
                        <input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="tw-dash-read-all" value="Leer todos los datos">
                    </p>
                </div>
            </div>
        `;

        Dialog.show("Dashboard", html);
        this.attachEvents();
    }

    private attachEvents() {
        // Since Dialog.show injects into DOM asynchronously or synchronously, 
        // we can query elements by ID safely right after or with a slight timeout.
        setTimeout(() => {
            const radios = document.querySelectorAll<HTMLInputElement>('input[name="tw-dash-mode"]');
            radios.forEach(r => r.addEventListener('change', (e) => {
                if ((e.target as HTMLInputElement).checked) {
                    this.setMode((e.target as HTMLInputElement).value);
                }
            }));

            const addFilterBtn = document.getElementById('tw-dash-add-filter');
            if (addFilterBtn) {
                addFilterBtn.addEventListener('click', () => {
                    const variable = (document.getElementById('tw-dash-var') as HTMLSelectElement).value;
                    const op = (document.getElementById('tw-dash-op') as HTMLSelectElement).value;
                    const val = (document.getElementById('tw-dash-val') as HTMLInputElement).value;

                    if (val && !isNaN(Number(val))) {
                        this.scraper.addFilter(variable, op, val);
                        this.render(); // re-render dialog
                    } else {
                        UI.ErrorMessage("Introduce un valor numérico válido.", 3000);
                    }
                });
            }

            const deleteBtns = document.querySelectorAll('.tw-delete-filter');
            deleteBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const target = e.target as HTMLElement;
                    const variable = target.getAttribute('data-var');
                    const idxStr = target.getAttribute('data-idx');
                    if (variable && idxStr) {
                        const idx = parseInt(idxStr, 10);
                        this.scraper.removeFilter(variable, idx);
                        this.render(); // re-render dialog
                    }
                });
            });

            const runBtn = document.getElementById('tw-dash-run');
            if (runBtn) {
                runBtn.addEventListener('click', () => {
                    this.startScraping('csv');
                });
            }

            const readAllBtn = document.getElementById('tw-dash-read-all');
            if (readAllBtn) {
                readAllBtn.addEventListener('click', () => {
                    this.startScraping('ui');
                });
            }
        }, 100);
    }

    private startScraping(displayMode: 'csv' | 'ui') {
        const html = '<label> Extrayendo... </label><progress id="tw-dash-bar" max="1" value="0" style="width: 100%;"></progress>';
        Dialog.show("Progreso", html);

        this.scraper.readData(
            this.mode,
            (progress: number) => {
                const bar = document.getElementById('tw-dash-bar') as HTMLProgressElement;
                if (bar) bar.value = progress;
            },
            (result: ReadResult) => {
                this.lastReadResult = result;
                if (displayMode === 'csv') {
                    this.showData(result.csvData);
                } else {
                    this.showPlayerDashboard(result);
                }
            }
        );
    }

    private showData(data: string) {
        const html = `
            <p><h2>Datos de la tribu</h2>Modo seleccionado: ${this.mode}</p>
            <p><textarea readonly=true style="width: 100%; height: 200px;">${data}</textarea></p>
            <p>
                <input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="tw-dash-download" value="Descargar como CSV">
                <input type="button" class="btn evt-confirm-btn btn-confirm-no" id="tw-dash-back" value="Volver al menú principal">
            </p>
        `;
        Dialog.show("Datos de la tribu", html);

        setTimeout(() => {
            const downloadBtn = document.getElementById('tw-dash-download');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    this.downloadCSV('tribe_info', data);
                });
            }

            const backBtn = document.getElementById('tw-dash-back');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    this.render();
                });
            }
        }, 100);
    }

    private showPlayerDashboard(result: ReadResult) {
        const playerOptions = result.players.map(player =>
            `<option value="${player.playerId}">${player.playerName} (${player.villages.length})</option>`
        ).join('');

        const html = `
            <div style="max-width: 1340px; width: 100%;">
                <p><h2>Datos de todos los jugadores</h2></p>
                <p>Modo seleccionado: ${result.mode}</p>
                <p>Jugadores encontrados: ${result.players.length}</p>
                <p>
                    <input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="tw-dash-download" value="Descargar como CSV">
                    <input type="button" class="btn evt-confirm-btn btn-confirm-no" id="tw-dash-back" value="Volver al menú principal">
                </p>
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <div style="flex: 0 0 260px; max-height: 500px; overflow-y: auto; padding: 8px; border: 1px solid #888; background: #f8f8f8;">
                        <div style="font-weight: bold; margin-bottom: 8px;">Selecciona jugador</div>
                        <select id="tw-dash-player-select" style="width: 100%; margin-bottom: 12px;">
                            <option value="">-- Elige un jugador --</option>
                            ${playerOptions}
                        </select>
                        <div id="tw-dash-player-sidebar"></div>
                    </div>
                    <div style="flex: 1; max-height: 500px; overflow: auto;">
                        <div id="tw-dash-player-details"></div>
                    </div>
                </div>
            </div>
        `;

        Dialog.show("Datos de jugadores", html);

        const popup = document.getElementById('popup_box_Datos de jugadores');
        if (popup) {
            popup.style.width = '1340px';
            popup.style.maxWidth = '1340px';
        }

        setTimeout(() => {
            const downloadBtn = document.getElementById('tw-dash-download');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    this.downloadCSV('tribe_info', result.csvData);
                });
            }

            const backBtn = document.getElementById('tw-dash-back');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    this.render();
                });
            }

            const playerSelect = document.getElementById('tw-dash-player-select') as HTMLSelectElement;
            if (playerSelect) {
                playerSelect.addEventListener('change', () => {
                    this.renderPlayerDetails(playerSelect.value, result);
                });
                if (result.players.length > 0) {
                    const firstPlayer = result.players[0];
                    if (firstPlayer) {
                        playerSelect.selectedIndex = 1;
                        this.renderPlayerDetails(firstPlayer.playerId, result);
                    }
                }
            }
        }, 100);
    }

    private renderPlayerDetails(playerId: string, result: ReadResult) {
        const detailsContainer = document.getElementById('tw-dash-player-details');
        const sidebar = document.getElementById('tw-dash-player-sidebar');
        if (!detailsContainer || !sidebar) return;

        const player = result.players.find(p => p.playerId === playerId);
        if (!player) {
            detailsContainer.innerHTML = '<p>Selecciona un jugador para ver sus datos.</p>';
            sidebar.innerHTML = '';
            return;
        }

        const totalVillages = player.villages.length;
        const sidebarHtml = `
            <div style="font-weight: bold; margin-bottom: 8px;">${player.playerName}</div>
            <div>Player ID: ${player.playerId}</div>
            <div>Aldeas encontradas: ${totalVillages}</div>
        `;
        sidebar.innerHTML = sidebarHtml;

        const headers = ['Coordenadas', 'Puntos', ...result.displayHeadersList];
        const headerRow = headers.map(h => `<th style="padding: 4px; border: 1px solid #ccc;">${h}</th>`).join('');

        const tableRows = player.villages.map(village => {
            const values = result.headersList.map(key => `<td style="padding: 4px; border: 1px solid #ccc; text-align: right;">${village.values[key] || '0'}</td>`).join('');
            return `
                <tr>
                    <td style="padding: 4px; border: 1px solid #ccc;">${village.x}|${village.y}</td>
                    <td style="padding: 4px; border: 1px solid #ccc; text-align: right;">${village.points}</td>
                    ${values}
                </tr>
            `;
        }).join('');

        detailsContainer.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold;">Datos de ${player.playerName}</div>
            <table class="vis" style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead><tr>${headerRow}</tr></thead>
                <tbody>${tableRows || '<tr><td colspan="' + headers.length + '" style="padding: 8px; border: 1px solid #ccc; text-align: center;">No hay datos visibles.</td></tr>'}</tbody>
            </table>
        `;
    }

    private downloadCSV(filename: string, text: string) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename + '.csv');

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }
}
