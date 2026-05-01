function openUI() {
    html = '<head></head><body><h1>Tribe troop counter</h1><form><fieldset><legend>Settings</legend><p><input type="radio" name="mode" id="of" value="Read troops of the village" onchange="setMode(\'members_troops\')">Read troops of the village</input></p><p><input type="radio" name="mode" id="in" value="Read defenses in the village" onchange="setMode(\'members_defense\')">Read defenses in the village</input></p></fieldset><fieldset><legend>Filters</legend><select id="variable"><option value="x">x</option><option value="y">y</option>' + createUnitOption() + '</select><select id="kind"><option value=">">\></option><option value="<">\<</option></select><input type="text" id="value"></input><input type="button" class="btn evt-confirm-btn btn-confirm-yes" onclick="addFilter()" value="Save filter"></input><p><table><tr><th>Variable filtered</th><th>Operatore</th><th>Value</th><th></th></tr>' + createFilterTable() + '</form></p></fieldset><div><p><input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="run" onclick="readData()" value="Read data"></input></p></div></body>';
    Dialog.show("Troop counter", html);
    if (localStorage.troopCounterMode) {
        if (localStorage.troopCounterMode == "members_troops") {
            document.getElementById("of").checked = true;

        } else {
            document.getElementById("in").checked = true;
        }

    } else {
        document.getElementById("of").checked = true;
    }
}

function setMode(a) {
    localStorage.troopCounterMode = a;
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename + '.csv');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function downloadInfo(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, false);
    request.send(null);
    return request.response;
}

function getPlayerDict() {
    playerDict = {};
    now = new Date();
    server = window.location.host;
    if (localStorage.playerDictFake) {
        if (localStorage.playerDictFake.split(":::")[0] == server) {
            savedDate = new Date(localStorage.playerDictFake.split(":::")[1])
            if (now - savedDate < 1000 * 60 * 60) {
                playerDict = JSON.parse(localStorage.playerDictFake.split(":::")[2]);
                return playerDict;
            }
        }
    }
    playerUrl = "https://" + window.location.host + "/map/player.txt";
    playerList = downloadInfo(playerUrl).split("\n");
    for (i = 0; i < playerList.length; i++) {
        if (playerList[i] != "") {
            row = playerList[i].split(",");
            playerDict[row[0]] = row[1].replace(/\+/g, " ");
        }
    }
    localStorage.playerDictFake = server + ":::" + now + ":::" + JSON.stringify(playerDict);
    return playerDict;

}

function addFilter() {
    filters = {};
    if (localStorage.troopCounterFilter) {
        filters = JSON.parse(localStorage.troopCounterFilter);
    }
    if (filters[document.getElementById("variable").value]) {
        if (isNaN(document.getElementById("value").value)) {
            UI.ErrorMessage("Insert a valid value", 3000);

        } else {
            filters[document.getElementById("variable").value].push([document.getElementById("kind").value, document.getElementById("value").value]);
        }

    } else {
        if (isNaN(document.getElementById("value").value)) {
            UI.ErrorMessage("Insert a valid value", 3000);

        } else {
            filters[document.getElementById("variable").value] = [[document.getElementById("kind").value, document.getElementById("value").value]];
        }
    }
    localStorage.troopCounterFilter = JSON.stringify(filters);
    openUI();
}

function createUnitOption() {
    unitsList = game_data.units;
    menu = "";
    for (i = 0; i < unitsList.length; i++) {
        menu = menu + '<option value="' + unitsList[i] + '">' + unitsList[i] + '</option>';
    }
    return menu;
}

function createFilterTable() {
    filters = {};
    if (localStorage.troopCounterFilter) {
        filters = JSON.parse(localStorage.troopCounterFilter);
    }
    rows = ""
    for (filter in filters) {
        for (i = 0; i < filters[filter].length; i++) {
            rows = rows + '<tr><td>' + filter + '</td><td>' + filters[filter][i][0] + '</td><td>' + filters[filter][i][1] + '</td><td><input type="image" src="https://dsit.innogamescdn.com/asset/cbd6f76/graphic/delete.png" onclick="deleteFilter(\'' + filter + '\',\'' + i.toString() + '\')"></input></td></tr>';
        }
    }
    return rows;
}

function deleteFilter(filter, i) {
    if (localStorage.troopCounterFilter) {
        filtres = JSON.parse(localStorage.troopCounterFilter);
        if (filter in filtres) {
            if (parseInt(i) < filtres[filter].length) {
                filtres[filter].splice(parseInt(i), 1);
            }
        }
    }
    localStorage.troopCounterFilter = JSON.stringify(filtres);
    openUI();
}

function readData() {
    if (game_data.mode == "members") {
        var html = '<label> Reading...     </label><progress id="bar" max="1" value="0">  </progress>';
        Dialog.show("Progress bar", html);

        // Cargar filtros
        filtres = localStorage.troopCounterFilter ? JSON.parse(localStorage.troopCounterFilter) : {};

        // Obtener informaciÃ³n de miembros
        table = document.getElementsByClassName("vis");
        console.log("[readData] Tablas con clase 'vis' encontradas:", table.length);
        if (!table[2]) {
            console.error("[readData] No se encontró table[2] con clase 'vis'. Abortando.");
            return;
        }
        nMembers = table[2].rows.length;
        console.log("[readData] Filas en table[2]:", nMembers);
        playerInfoList = [];

        for (i = 1; i < nMembers - 1; i++) {
            let rowHTML = table[2].rows[i].innerHTML;
            let playerIdRaw = rowHTML.split("[")[1];
            let villageAmountRaw = rowHTML.split("<td class=\"lit-item\">")[4];
            if (!playerIdRaw) {
                console.warn(`[readData] Fila ${i}: no se pudo extraer playerId. innerHTML:`, rowHTML.substring(0, 200));
            }
            if (!villageAmountRaw) {
                console.warn(`[readData] Fila ${i}: no se pudo extraer villageAmount. innerHTML:`, rowHTML.substring(0, 200));
            }
            let playerId = playerIdRaw ? playerIdRaw.split("]")[0] : null;
            let villageAmount = villageAmountRaw ? villageAmountRaw.split("</td>")[0] : "0";
            console.log(`[readData] Fila ${i} -> playerId: ${playerId}, villageAmount: ${villageAmount}`);
            playerInfoList.push({ playerId, villageAmount });
        }
        console.log("[readData] playerInfoList:", playerInfoList);

        mode = localStorage.troopCounterMode;
        console.log("[readData] Modo:", mode);
        data = "Coords,Player,Points,";
        unitsList = game_data.units;
        console.log("[readData] Unidades:", unitsList);
        for (k = 0; k < unitsList.length; k++) {
            data = data + unitsList[k] + ",";
        }
        players = getPlayerDict();
        data = data + "\n";
        i = 0;
        let pageNumber = 1;

        (function loop() {
            const currentPlayer = playerInfoList[i];
            const url = "https://" + window.location.host + "/game.php?screen=ally&mode=" + mode + "&player_id=" + currentPlayer.playerId + "&page=" + pageNumber;
            console.log(`[loop] Procesando jugador ${i + 1}/${playerInfoList.length} - playerId: ${currentPlayer.playerId}, página: ${pageNumber}, url: ${url}`);

            page = $.ajax({
                url: url,
                async: false,
                function(result) {
                    return result.responseText;
                }
            });
            console.log(`[loop] Respuesta HTTP status: ${page.status}`);
            document.getElementById("bar").value = (i / playerInfoList.length);

            const parser = new DOMParser();
            const doc = parser.parseFromString(page.responseText, 'text/html');
            const tables = doc.querySelectorAll('table.vis.w100');
            console.log(`[loop] Tablas 'vis w100' encontradas en respuesta: ${tables.length}`);
            const troopTable = tables.length > 0 ? tables[tables.length - 1] : null;

            if (!troopTable) {
                console.warn(`[loop] No se encontró tabla de tropas para playerId ${currentPlayer.playerId}. Fragmento de respuesta:`, page.responseText.substring(0, 500));
            } else {
                const allRows = Array.from(troopTable.querySelectorAll('tbody > tr, tr'));
                const step = mode === 'members_defense' ? 2 : 1;
                console.log(`[loop] Filas en tabla: ${allRows.length}, step: ${step}`);

                // El primer tr (índice 0) es la cabecera, los siguientes son jugadores/aldeas
                for (let j = 1; j < allRows.length; j += step) {
                    const tds = Array.from(allRows[j].querySelectorAll('td'));
                    if (tds.length < 2) {
                        console.warn(`[loop] Fila ${j} ignorada: solo ${tds.length} celdas`);
                        continue;
                    }

                    villageData = {};

                    // Extraer coordenadas del texto de la primera celda
                    const coordMatch = tds[0].textContent.match(/\((\d{1,3})\|(\d{1,3})\)/);
                    if (coordMatch) {
                        villageData["x"] = coordMatch[1];
                        villageData["y"] = coordMatch[2];
                    } else {
                        console.warn(`[loop] Fila ${j}: no se encontraron coordenadas en celda 0: "${tds[0].textContent.trim()}"`);
                        villageData["x"] = "0";
                        villageData["y"] = "0";
                    }

                    // Extraer puntos de la segunda celda
                    villageData["points"] = tds[1].textContent.trim().replace(/\./g, '');

                    // Extraer tropas: cada celda a partir de la índice 2
                    for (k = 0; k < unitsList.length; k++) {
                        const td = tds[k + 2];
                        villageData[unitsList[k]] = td ? td.textContent.trim() : "0";
                    }
                    console.log(`[loop] Fila ${j} parseada:`, villageData);

                    // Aplicar filtros
                    filtered = true;
                    for (key in filtres) {
                        for (k = 0; k < filtres[key].length; k++) {
                            if ((filtres[key][k][0] === ">" && parseInt(villageData[key]) < parseInt(filtres[key][k][1])) ||
                                (filtres[key][k][0] === "<" && parseInt(villageData[key]) > parseInt(filtres[key][k][1]))) {
                                filtered = false;
                                console.log(`[loop] Fila ${j} filtrada por ${key} ${filtres[key][k][0]} ${filtres[key][k][1]}`);
                                break;
                            }
                        }
                        if (!filtered) break;
                    }

                    // AÃ±adir datos si pasa los filtros
                    if (filtered) {
                        data += `${villageData["x"]}|${villageData["y"]},${players[currentPlayer.playerId]},${villageData["points"]},`;
                        data += unitsList.map(unit => villageData[unit]).join(",") + "\n";
                    }
                }
            }
            i++;

            if (troopTable !== null && playerInfoList[i] && playerInfoList[i].villageAmount / 1000 > pageNumber) {
                console.log(`[loop] Más páginas para playerId ${playerInfoList[i].playerId}: página ${pageNumber + 1}`);
                i--;
                pageNumber++;
            } else {
                pageNumber = 1;
            }

            if (i < playerInfoList.length) {
                setTimeout(loop, 200);
            } else {
                console.log("[loop] Todos los jugadores procesados. Mostrando datos.");
                showData(data, mode);
            }
        })();
    }
}

function showData(data) {
    html = '<head></head><body><p><h2>Tribe data</h2>Mode selected: ' + mode + '</p><p><textarea readonly=true>' + data + '</textarea></p><p><input type="button" class="btn evt-confirm-btn btn-confirm-yes" id="download" onclick="download(\'tribe info\',data)" value="Download as csv"></input><input type="button" class="btn evt-confirm-btn btn-confirm-no" onclick="openUI()" value="Back to main menu"></input></p></body>';
    Dialog.show("Tribe data", html);
}


openUI();