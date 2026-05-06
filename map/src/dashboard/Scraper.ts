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
        const text = (cell.textContent || "").trim();
        const img = cell.querySelector('img');
        if (img && img.src) {
            const unitMatch = img.src.match(/unit_(\w+)\.(?:webp|png|gif)/i);
            if (unitMatch) {
                return unitMatch[1].toLowerCase();
            }
            const buildingMatch = img.src.match(/buildings\/(\w+)\.(?:webp|png|gif)/i);
            if (buildingMatch) {
                return buildingMatch[1].toLowerCase();
            }
        }

        const normalizedText = this.normalizeHeaderText(text);
        const imgTitle = img ? ((img.getAttribute('data-title') || img.getAttribute('title') || '').trim()) : '';
        const cellTitle = (cell.getAttribute('data-title') || '').trim();
        const normalizedImgTitle = this.normalizeHeaderText(imgTitle);
        const normalizedCellTitle = this.normalizeHeaderText(cellTitle);
        const headerText = [normalizedText, normalizedImgTitle, normalizedCellTitle].filter(Boolean).join(' ');

        for (let k = 0; k < headersList.length; k++) {
            const key = headersList[k];
            const normalizedKey = this.normalizeHeaderText(key);
            const display = displayHeadersList[k] ? this.normalizeHeaderText(displayHeadersList[k]) : "";

            if (display && headerText.indexOf(display) !== -1) {
                return key;
            }
            if (normalizedKey && headerText.indexOf(normalizedKey) !== -1) {
                return key;
            }
            if (display && normalizedText.indexOf(display) !== -1) {
                return key;
            }
            if (normalizedKey && normalizedText.indexOf(normalizedKey) !== -1) {
                return key;
            }
            if (display && normalizedCellTitle.indexOf(display) !== -1) {
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
        } else if (trs.length > 0) {
            const headerCells = trs[0].querySelectorAll('th,td');
            if (headerCells.length >= 3) {
                headerCells.forEach((cell, idx) => {
                    const headerKey = this.getHeaderKeyForCell(cell as HTMLTableCellElement, mode, headersList, displayHeadersList);
                    if (headerKey) {
                        indexToKey[idx] = headerKey;
                    }
                });
                startRow = 1;
            }
        }

        return { indexToKey, startRow };
    }

    private fetchPageHtml(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            $.ajax({
                url,
                success: (result: string) => resolve(result),
                error: (_jqXHR: any, textStatus: string, errorThrown: string) => reject(new Error(`${textStatus} - ${errorThrown}`))
            });
        });
    }

    private normalizeHeaderText(text: string): string {
        return (text || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    private fetchPageHtmlWithRetry(url: string, retries = 3, delayMs = 1200): Promise<string> {
        return new Promise((resolve, reject) => {
            const attempt = (remaining: number) => {
                $.ajax({
                    url,
                    success: (result: string) => resolve(result),
                    error: (jqXHR: any, textStatus: string, errorThrown: string) => {
                        const status = jqXHR && jqXHR.status;
                        if (remaining > 0 && (status === 429 || status === 0)) {
                            console.warn(`[Scraper] Retry ${url} after status=${status}; remaining=${remaining}`);
                            setTimeout(() => attempt(remaining - 1), delayMs * (4 - remaining));
                            return;
                        }
                        reject(new Error(`${status || 0} ${textStatus} - ${errorThrown}`));
                    }
                });
            };
            attempt(retries);
        });
    }

    private parsePlayerTable(html: string, mode: string, headersList: string[], displayHeadersList: string[]): VillageData[] {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const candidateTables = Array.from(doc.querySelectorAll('table.vis.w100, table.vis')) as HTMLTableElement[];
        if (candidateTables.length === 0) {
            return [];
        }

        let dataTable: HTMLTableElement | null = null;
        let selectedIndex = -1;
        for (let i = 0; i < candidateTables.length; i++) {
            const table = candidateTables[i];
            const { indexToKey } = this.buildHeaderIndexMap(table, mode, headersList, displayHeadersList);
            const mappedColumns = Object.keys(indexToKey).length;
            if (mappedColumns >= 2) {
                dataTable = table;
                selectedIndex = i;
                break;
            }
        }

        if (!dataTable) {
            dataTable = candidateTables[candidateTables.length - 1];
            selectedIndex = candidateTables.length - 1;
        }

        const { indexToKey, startRow } = this.buildHeaderIndexMap(dataTable, mode, headersList, displayHeadersList);
        console.log(`[Scraper] parsePlayerTable mode=${mode} selectedTable=${selectedIndex} mappedHeaders=${Object.keys(indexToKey).length}`);

        const trs = dataTable.querySelectorAll('tr');
        const villages: VillageData[] = [];

        for (let j = startRow; j < trs.length; j++) {
            const row = trs[j];
            if (!row || row.querySelector('th')) continue;

            const tds = row.querySelectorAll('td');
            const textContent = row.textContent || '';
            const coordMatch = textContent.match(/\((\d{1,3})\|(\d{1,3})\)/);
            const x = coordMatch ? coordMatch[1] : '0';
            const y = coordMatch ? coordMatch[2] : '0';
            let points = '0';
            if (tds.length >= 2 && tds[1]) {
                points = (tds[1].textContent || '0').replace(/\./g, '').trim();
            }

            const values: Record<string, string> = {};
            tds.forEach((cell, idx) => {
                const headerKey = indexToKey[idx];
                if (!headerKey) return;

                let val = cell.textContent?.trim() || '0';
                if (cell.classList.contains('hidden')) {
                    val = '0';
                }
                values[headerKey] = val;
            });

            villages.push({ x, y, points, values });
        }

        return villages;
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
            // Extrae playerId desde el enlace del jugador: ...screen=info_player&id=12345
            const playerLink = rowEl.querySelector<HTMLAnchorElement>('a[href*="screen=info_player"][href*="id="]');
            const playerHref = playerLink?.getAttribute('href') || '';
            const playerMatch = playerHref.match(/[?&]id=(\d+)/);
            const playerId = playerMatch ? playerMatch[1] : null;

            // "Pueblos" suele venir en una celda lit-item; fallback a regex si cambia el layout.
            const tds = rowEl.querySelectorAll<HTMLTableCellElement>('td');
            let villageAmount = 1;
            if (tds.length > 1 && tds[1]) {
                const villageText = (tds[1].textContent || '').replace(/[^\d]/g, '').trim();
                villageAmount = parseInt(villageText, 10) || 1;
            } else {
                const villagesMatch = rowHtml.match(/<td[^>]*class="[^"]*lit-item[^"]*"[^>]*>\s*(\d+)/i);
                villageAmount = villagesMatch ? (parseInt(villagesMatch[1], 10) || 1) : 1;
            }

            if (!playerId || isNaN(parseInt(playerId, 10))) {
                const secondCellText = tds.length > 1 && tds[1]
                    ? ((tds[1].textContent || '').trim())
                    : '';
                console.warn(
                    `[Scraper] Fila ${i}: no se pudo extraer playerId. href="${playerHref}", tds=${tds.length}, segundaCelda="${secondCellText}". HTML:`,
                    rowHtml.substring(0, 200)
                );
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
        
        const unitHeaders = game_data.units || ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];
        const buildingHeaders = ['main', 'barracks', 'stable', 'garage', 'snob', 'smith', 'place', 'statue', 'market', 'wood', 'stone', 'iron', 'farm', 'storage', 'hide', 'wall'];
        const buildingDisplayHeaders = ['Edificio Principal', 'Cuartel', 'Cuadra', 'Taller', 'Corte', 'Herrería', 'Plaza de reuniones', 'Estatua', 'Mercado', 'Leñador', 'Barrera', 'Mina de hierro', 'Granja', 'Almacén', 'Escondrijo', 'Muralla'];

        let headersList: string[] = [];
        let displayHeadersList: string[] = [];
        let parsePrimaryHeaders: string[] = [];
        let parseBuildingHeaders: string[] = [];
        let parseBuildingDisplayHeaders: string[] = [];

        if (mode === "members_buildings") {
            headersList = buildingHeaders;
            displayHeadersList = buildingDisplayHeaders;
            parsePrimaryHeaders = buildingHeaders;
            parseBuildingHeaders = [];
        } else if (mode === "members_troops") {
            headersList = [...unitHeaders, ...buildingHeaders];
            displayHeadersList = [...unitHeaders, ...buildingDisplayHeaders];
            parsePrimaryHeaders = unitHeaders;
            parseBuildingHeaders = buildingHeaders;
            parseBuildingDisplayHeaders = buildingDisplayHeaders;
        } else {
            headersList = unitHeaders;
            displayHeadersList = unitHeaders;
            parsePrimaryHeaders = unitHeaders;
            parseBuildingHeaders = [];
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

            this.fetchPageHtmlWithRetry(url).then(result => {
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
                    currentIndex++;
                    pageNumber = 1;
                    setTimeout(loop, 1200);
                    return;
                }

                const primaryHtml = result;
                const buildingHtmlPromise = mode === 'members_troops'
                    ? this.fetchPageHtmlWithRetry(`https://${window.location.host}/game.php?screen=ally&mode=members_buildings&player_id=${currentPlayer.playerId}&page=${pageNumber}`)
                    : Promise.resolve('');

                buildingHtmlPromise.then(buildingHtml => {
                    const primaryVillages = this.parsePlayerTable(primaryHtml, mode, parsePrimaryHeaders, displayHeadersList);
                    const buildingVillages = mode === 'members_troops'
                        ? this.parsePlayerTable(buildingHtml, 'members_buildings', parseBuildingHeaders, parseBuildingDisplayHeaders)
                        : [];

                    const villageMap: Record<string, VillageData> = {};

                    primaryVillages.forEach(village => {
                        const key = `${village.x}|${village.y}`;
                        villageMap[key] = { ...village, values: { ...village.values } };
                    });

                    buildingVillages.forEach(village => {
                        const key = `${village.x}|${village.y}`;
                        if (!villageMap[key]) {
                            villageMap[key] = { x: village.x, y: village.y, points: village.points || '0', values: {} };
                        }
                        villageMap[key].values = {
                            ...villageMap[key].values,
                            ...village.values,
                        };
                    });

                    Object.values(villageMap).forEach(villageData => {
                        const playerName = players[currentPlayer.playerId] || 'Unknown';
                        const row = `${villageData.x}|${villageData.y},${playerName},${villageData.points},` +
                            headersList.map(item => item ? (villageData.values[item] || '0') : '0').join(',') + '\n';
                        console.log(`[Scraper] Fila añadida al CSV:`, row.trim());
                        csvData += row;

                        if (currentPlayerData) {
                            currentPlayerData.villages.push({
                                x: villageData.x ?? '0',
                                y: villageData.y ?? '0',
                                points: villageData.points || '0',
                                values: headersList.reduce((acc: Record<string, string>, key) => {
                                    acc[key] = villageData.values[key] || '0';
                                    return acc;
                                }, {})
                            });
                        }
                    });

                    if ((currentPlayer.villageAmount / 1000) > pageNumber) {
                        console.log(`[Scraper] playerId=${currentPlayer.playerId}: hay más páginas (villageAmount=${currentPlayer.villageAmount}), cargando página ${pageNumber + 1}`);
                        pageNumber++;
                    } else {
                        currentIndex++;
                        pageNumber = 1;
                    }

                    setTimeout(loop, 1200);
                }).catch(error => {
                    console.error(`[Scraper] Error al cargar página adicional para playerId=${currentPlayer.playerId}, página=${pageNumber}:`, error);
                    currentIndex++;
                    pageNumber = 1;
                    setTimeout(loop, 1200);
                });
            }).catch(error => {
                console.error(`[Scraper] Error AJAX para playerId=${currentPlayer.playerId}, página=${pageNumber}:`, error);
                currentIndex++;
                pageNumber = 1;
                setTimeout(loop, 1200);
            });
        };

        loop();
    }
}
