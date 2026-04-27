declare const game_data: any;
declare const $: any;
declare const UI: any;
declare const Dialog: any;

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

    public readData(mode: string, onProgress: (progress: number) => void, onComplete: (csvData: string) => void) {
        if (game_data.mode !== "members" && game_data.mode !== "members_troops" && game_data.mode !== "members_defense" && game_data.mode !== "members_buildings") {
            UI.ErrorMessage("You must be on the Ally Members page to run this.", 3000);
            return;
        }

        const tables = document.getElementsByClassName("vis");
        let membersTable: HTMLTableElement | null = null;
        
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            if (table && table.innerHTML && table.innerHTML.includes('player_id=')) {
                membersTable = table as HTMLTableElement;
                break;
            }
        }

        if (!membersTable) {
            UI.ErrorMessage("Could not find members table.", 3000);
            return;
        }

        const playerInfoList: { playerId: string, villageAmount: number }[] = [];
        const rows = membersTable.rows;

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

                playerInfoList.push({ playerId, villageAmount });
            }
        }

        if (playerInfoList.length === 0) {
            UI.ErrorMessage("No members found.", 3000);
            return;
        }

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

        const players = this.getPlayerDict();
        let currentIndex = 0;
        let pageNumber = 1;

        const loop = () => {
            if (currentIndex >= playerInfoList.length) {
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

            $.ajax({
                url: url,
                success: (result: string) => {
                    onProgress(currentIndex / playerInfoList.length);

                    const parser = new DOMParser();
                    const doc = parser.parseFromString(result, "text/html");
                    
                    const visTables = doc.querySelectorAll('table.vis.w100');
                    let dataTable: HTMLTableElement | null = null;
                    
                    if (visTables.length > 0) {
                        dataTable = visTables[visTables.length - 1] as HTMLTableElement;
                    }

                    if (dataTable) {
                        const trs = dataTable.querySelectorAll('tr');
                        
                        let step = mode === "members_defense" ? 2 : 1;
                        let startRow = 1; 
                        
                        if (trs.length > 1 && trs[1] && trs[1].querySelector('th')) {
                            startRow = 2;
                        }

                        for (let j = startRow; j + step - 1 < trs.length; j += step) {
                            const row = trs[j];
                            if (!row || row.querySelector('th')) continue;

                            let villageData: Record<string, string> = {};

                            const textContent = row.textContent || "";
                            const coordMatch = textContent.match(/\((\d{1,3}\|\d{1,3})\)/);
                            if (coordMatch && coordMatch[1]) {
                                const splitCoords = coordMatch[1].split("|");
                                villageData["x"] = splitCoords[0] || "0";
                                villageData["y"] = splitCoords[1] || "0";
                            } else {
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

                            if (mode === "members_buildings") {
                                for (let k = 0; k < headersList.length; k++) {
                                    const headerKey = headersList[k];
                                    if (!headerKey) continue;

                                    const cellIndex = k + 2;
                                    if (tds && tds.length > cellIndex) {
                                        const cell = tds[cellIndex];
                                        if (cell) {
                                            let val = cell.textContent?.trim() || "0";
                                            if (cell.classList.contains('hidden')) {
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
                                        if (cell && !cell.classList.contains('hidden')) {
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
                                const playerName = players[currentPlayer.playerId] || 'Unknown';
                                csvData += `${villageData["x"]}|${villageData["y"]},${playerName},${villageData["points"]},`;
                                csvData += headersList.map(item => item ? (villageData[item] || "0") : "0").join(",") + "\n";
                            }
                        }
                    }

                    if ((currentPlayer.villageAmount / 1000) > pageNumber) {
                        pageNumber++;
                    } else {
                        currentIndex++;
                        pageNumber = 1;
                    }

                    setTimeout(loop, 200);
                },
                error: () => {
                    currentIndex++;
                    pageNumber = 1;
                    setTimeout(loop, 200);
                }
            });
        };

        loop();
    }
}
