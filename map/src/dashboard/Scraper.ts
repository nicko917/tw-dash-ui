declare const game_data: any;
declare const $: any;
declare const UI: any;
declare const Dialog: any;

export interface VillageData {
    x: string;
    y: string;
    points: string;
    values: Record<string, string>;
}

export interface PlayerData {
    playerId: string;
    playerName: string;
    villages: VillageData[];
}

export interface ReadResult {
    csvData: string;
    players: PlayerData[];
    headersList: string[];
    displayHeadersList: string[];
    mode: string;
}

export class Scraper {
    private players: Record<string, string> = {};
    private filters: Record<string, [string, string][]> = {};

    constructor() {
        this.loadFilters();
    }

    public getFilters() {
        return this.filters;
    }

    public saveFilters(filters: Record<string, [string, string][]>) {
        this.filters = filters;
        localStorage.troopCounterFilter = JSON.stringify(this.filters);
    }

    public addFilter(variable: string, kind: string, value: string) {
        if (!this.filters[variable]) {
            this.filters[variable] = [];
        }
        this.filters[variable].push([kind, value]);
        this.saveFilters(this.filters);
    }

    public removeFilter(variable: string, index: number) {
        if (this.filters[variable]) {
            this.filters[variable].splice(index, 1);
            if (this.filters[variable].length === 0) {
                delete this.filters[variable];
            }
            this.saveFilters(this.filters);
        }
    }

    private loadFilters() {
        if (localStorage.troopCounterFilter) {
            try {
                this.filters = JSON.parse(localStorage.troopCounterFilter);
            } catch (e) {
                this.filters = {};
            }
        }
    }

    public getPlayerDict(): Record<string, string> {
        let playerDict: Record<string, string> = {};
        const now = new Date().getTime();
        const server = window.location.host;

        if (localStorage.playerDictFake) {
            const parts = localStorage.playerDictFake.split(":::");
            if (parts[0] === server) {
                const savedDate = parseInt(parts[1], 10);
                if (now - savedDate < 1000 * 60 * 60) {
                    try {
                        playerDict = JSON.parse(parts[2]);
                        this.players = playerDict;
                        return playerDict;
                    } catch (e) {
                        // ignore and fetch again
                    }
                }
            }
        }

        const playerUrl = "https://" + window.location.host + "/map/player.txt";
        
        const request = new XMLHttpRequest();
        request.open('GET', playerUrl, false);
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

    private getHeaderKeyForCell(cell: HTMLTableCellElement, mode: string, headersList: string[], displayHeadersList: string[]): string | null {
        const text = (cell.textContent || "").trim().toLowerCase();
        const img = cell.querySelector('img');
        if (img && img.src) {
            const match = img.src.match(/unit_(\w+)\.(?:webp|png|gif)/i);
            if (match) {
                return match[1].toLowerCase();
            }
        }

        for (let k = 0; k < headersList.length; k++) {
            const key = headersList[k];
            const display = displayHeadersList[k] ? displayHeadersList[k].toLowerCase() : "";
            if (display && text.indexOf(display) !== -1) {
                return key;
            }
            if (key && text === key.toLowerCase()) {
                return key;
            }
        }

        return null;
    }

    private buildHeaderIndexMap(dataTable: HTMLTableElement, mode: string, headersList: string[], displayHeadersList: string[]): { indexToKey: Record<number, string>, startRow: number } {
        const trs = dataTable.querySelectorAll('tr');
        let headerRowIndex = -1;
        for (let i = 0; i < trs.length; i++) {
            if (trs[i].querySelector('th')) {
                headerRowIndex = i;
                break;
            }
        }

        const indexToKey: Record<number, string> = {};
        let startRow = 1;
        if (headerRowIndex >= 0) {
            const headerCells = trs[headerRowIndex].querySelectorAll('th,td');
            headerCells.forEach((cell, idx) => {
                const headerKey = this.getHeaderKeyForCell(cell as HTMLTableCellElement, mode, headersList, displayHeadersList);
                if (headerKey) {
                    indexToKey[idx] = headerKey;
                }
            });
            startRow = headerRowIndex + 1;
        }

        return { indexToKey, startRow };
    }

    public readData(mode: string, onProgress: (progress: number) => void, onComplete: (result: ReadResult) => void) {
        if (game_data.mode !== "members" && game_data.mode !== "members_troops" && game_data.mode !== "members_defense" && game_data.mode !== "members_buildings") {
            UI.ErrorMessage("You must be on the Ally Members page to run this.", 3000);
            return;
        }

        // El juego siempre tiene la tabla de miembros en el índice 2 de los elementos con clase "vis"
        const tables = document.getElementsByClassName("vis");
        console.log(`[Scraper] Tablas con clase 'vis' en el DOM: ${tables.length}`, Array.from(tables).map((t, i) => `[${i}] ${t.className}`));
        const membersTable = tables[2] as HTMLTableElement | undefined;

        if (!membersTable) {
            console.error('[Scraper] No se encontró tables[2]. Tablas disponibles:', Array.from(tables).map((t, i) => `[${i}] ${t.className}`));
            UI.ErrorMessage("Could not find members table.", 3000);
            return;
        }

        const playerInfoList: { playerId: string, villageAmount: number }[] = [];
        const rows = membersTable.rows;
        console.log(`[Scraper] Filas en tables[2] (${membersTable.className}): ${rows.length}`);

        // Fila 0 = cabecera; última fila = totales → iterar de 1 a length-2
        for (let i = 1; i < rows.length - 1; i++) {
            const rowEl = rows[i];
            if (!rowEl) continue;

            const rowHtml = rowEl.innerHTML;
            // El patrón en el HTML es: name="player_id[2129190][id]"
            // split("[")[1] => "2129190][id]..." → split("]")[0] => "2129190"
            const bracketSplit = rowHtml.split("[");
            const playerId = bracketSplit[1] ? bracketSplit[1].split("]")[0] : null;

            // La columna "Pueblos" es el 5º td.lit-item (split produce array, índice 4 es el 5º fragmento)
            const litItemSplit = rowHtml.split('<td class="lit-item">');
            const villageAmountCell = litItemSplit[4];
            const villageAmountRaw = villageAmountCell
                ? (villageAmountCell.split("</td>")[0] ?? "").trim()
                : "1";
            const villageAmount = parseInt(villageAmountRaw, 10) || 1;

            if (!playerId || isNaN(parseInt(playerId, 10))) {
                console.warn(`[Scraper] Fila ${i}: no se pudo extraer playerId. HTML:`, rowHtml.substring(0, 200));
                continue;
            }

            console.log(`[Scraper] Fila ${i} -> playerId: ${playerId}, villageAmount: ${villageAmount}`);
            playerInfoList.push({ playerId, villageAmount });
        }

        if (playerInfoList.length === 0) {
            console.error('[Scraper] playerInfoList vacío. No se encontraron miembros.');
            UI.ErrorMessage("No members found.", 3000);
            return;
        }
        console.log(`[Scraper] Total jugadores a procesar: ${playerInfoList.length}`, playerInfoList);

        let csvData = "Coords,Player,Points,";
        
        let headersList: string[] = [];
        let displayHeadersList: string[] = [];
        if (mode === "members_buildings") {
            headersList = ['main', 'barracks', 'stable', 'garage', 'snob', 'smith', 'place', 'statue', 'market', 'wood', 'stone', 'iron', 'farm', 'storage', 'hide', 'wall'];
            displayHeadersList = ['Edificio Principal', 'Cuartel', 'Cuadra', 'Taller', 'Corte', 'Herrería', 'Plaza de reuniones', 'Estatua', 'Mercado', 'Leñador', 'Barrera', 'Mina de hierro', 'Granja', 'Almacén', 'Escondrijo', 'Muralla'];
        } else {
            headersList = game_data.units || ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];
            displayHeadersList = headersList;
        }

        for (let k = 0; k < displayHeadersList.length; k++) {
            csvData += displayHeadersList[k] + (k === displayHeadersList.length - 1 ? "" : ",");
        }
        csvData += "\n";

        const readResult: ReadResult = {
            csvData,
            players: [],
            headersList,
            displayHeadersList,
            mode,
        };

        const players = this.getPlayerDict();
        let currentIndex = 0;
        let pageNumber = 1;
        let currentPlayerData: PlayerData | null = null;

        const loop = () => {
            if (currentIndex >= playerInfoList.length) {
                console.log('[Scraper] Todos los jugadores procesados. Generando CSV.');
                readResult.csvData = csvData;
                onProgress(1);
                onComplete(readResult);
                return;
            }

            const currentPlayer = playerInfoList[currentIndex];
            if (!currentPlayer) {
                currentIndex++;
                setTimeout(loop, 200);
                return;
            }

            if (!currentPlayerData || currentPlayerData.playerId !== currentPlayer.playerId) {
                currentPlayerData = {
                    playerId: currentPlayer.playerId,
                    playerName: players[currentPlayer.playerId] || 'Unknown',
                    villages: []
                };
                readResult.players.push(currentPlayerData);
            }

            const url = `https://${window.location.host}/game.php?screen=ally&mode=${mode}&player_id=${currentPlayer.playerId}&page=${pageNumber}`;
            console.log(`[Scraper] [${currentIndex + 1}/${playerInfoList.length}] Fetching playerId=${currentPlayer.playerId}, página=${pageNumber} -> ${url}`);

            $.ajax({
                url: url,
                success: (result: string) => {
                    onProgress(currentIndex / playerInfoList.length);

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(result, "text/html");
                    
                    const visTables = doc.querySelectorAll('table.vis.w100');
                    console.log(`[Scraper] playerId=${currentPlayer.playerId}: tablas 'vis w100' en respuesta: ${visTables.length}`);
                    let dataTable: HTMLTableElement | null = null;
                    
                    if (visTables.length > 0) {
                        dataTable = visTables[visTables.length - 1] as HTMLTableElement;
                    }

                    if (!dataTable) {
                        console.warn(`[Scraper] playerId=${currentPlayer.playerId}: no se encontró tabla de datos. Fragmento HTML:`, result.substring(0, 600));
                    }

                    if (dataTable) {
                        const trs = dataTable.querySelectorAll('tr');
                        let step = mode === "members_defense" ? 2 : 1;
                        const { indexToKey, startRow } = this.buildHeaderIndexMap(dataTable, mode, headersList, displayHeadersList);
                        console.log(`[Scraper] playerId=${currentPlayer.playerId}: filas en tabla=${trs.length}, startRow=${startRow}, step=${step}`, indexToKey);

                        for (let j = startRow; j + step - 1 < trs.length; j += step) {
                            const row = trs[j];
                            if (!row || row.querySelector('th')) continue;

                            let villageData: Record<string, string> = {};

                            const textContent = row.textContent || "";
                            const coordMatch = textContent.match(/\((\d{1,3})\|(\d{1,3})\)/);
                            if (coordMatch) {
                                villageData["x"] = coordMatch[1] ?? "0";
                                villageData["y"] = coordMatch[2] ?? "0";
                            } else {
                                console.warn(`[Scraper] Fila ${j}: sin coordenadas. Texto: "${textContent.trim().substring(0, 80)}"`);
                                villageData["x"] = "0";
                                villageData["y"] = "0";
                            }

                            const tds = row.querySelectorAll('td');
                            if (tds && tds.length >= 2) {
                                const cell1 = tds[1];
                                if (cell1) {
                                    const pointsText = cell1.textContent || "0";
                                    villageData["points"] = pointsText.replace(/\./g, '').trim();
                                } else {
                                    villageData["points"] = "0";
                                }
                            } else {
                                villageData["points"] = "0";
                            }

                            if (tds) {
                                for (let idx = 0; idx < tds.length; idx++) {
                                    const headerKey = indexToKey[idx];
                                    if (!headerKey) continue;

                                    const cell = tds[idx];
                                    if (!cell) continue;

                                    let val = cell.textContent?.trim() || "0";
                                    if (cell.classList.contains('hidden')) {
                                        val = "0";
                                    }
                                    villageData[headerKey] = val;
                                }
                            }

                            for (let k = 0; k < headersList.length; k++) {
                                const headerKey = headersList[k];
                                if (!headerKey || villageData[headerKey] !== undefined) continue;

                                const cellIndex = k + 2;
                                let value = "0";
                                if (tds && tds.length > cellIndex) {
                                    const cell = tds[cellIndex];
                                    if (cell && !cell.classList.contains('hidden')) {
                                        value = cell.textContent?.trim() || "0";
                                    }
                                }
                                villageData[headerKey] = value;
                            }

                            let passedFilter = true;
                            for (const key in this.filters) {
                                const filterList = this.filters[key];
                                if (!filterList) continue;
                                for (let k = 0; k < filterList.length; k++) {
                                    const filterItem = filterList[k];
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
                                const playerName = players[currentPlayer.playerId] || 'Unknown';
                                const row = `${villageData["x"]}|${villageData["y"]},${playerName},${villageData["points"]},` +
                                    headersList.map(item => item ? (villageData[item] || "0") : "0").join(",") + "\n";
                                console.log(`[Scraper] Fila añadida al CSV:`, row.trim());
                                csvData += row;

                                if (currentPlayerData) {
                                    currentPlayerData.villages.push({
                                        x: villageData["x"] ?? "0",
                                        y: villageData["y"] ?? "0",
                                        points: villageData["points"] || "0",
                                        values: headersList.reduce((acc: Record<string, string>, key) => {
                                            acc[key] = villageData[key] || "0";
                                            return acc;
                                        }, {})
                                    });
                                }
                            } else {
                                console.log(`[Scraper] Fila ${j} descartada por filtros. villageData:`, villageData);
                            }
                        }
                    }

                    if ((currentPlayer.villageAmount / 1000) > pageNumber) {
                        console.log(`[Scraper] playerId=${currentPlayer.playerId}: hay más páginas (villageAmount=${currentPlayer.villageAmount}), cargando página ${pageNumber + 1}`);
                        pageNumber++;
                    } else {
                        currentIndex++;
                        pageNumber = 1;
                    }

                    setTimeout(loop, 200);
                },
                error: (_jqXHR: any, textStatus: string, errorThrown: string) => {
                    console.error(`[Scraper] Error AJAX para playerId=${currentPlayer.playerId}, página=${pageNumber}: ${textStatus} - ${errorThrown}`);
                    currentIndex++;
                    pageNumber = 1;
                    setTimeout(loop, 200);
                }
            });
        };

        loop();
    }
}
