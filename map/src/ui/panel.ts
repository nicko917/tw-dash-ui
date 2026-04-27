import { Classifier } from '../core/classifier';
import { StorageService, type VillageStatus } from '../data/storage';

declare const TWMap: any;

export class Panel {
    private element: HTMLElement;
    private currentVillageId: string | null = null;
    private onStatusChangeCallback: ((villageId: string, status: VillageStatus) => void) | null = null;

    constructor() {
        this.element = document.createElement('div');
        this.element.id = 'map_custom_panel_element';
        this.element.style.position = 'absolute';
        this.element.style.display = 'none';
        this.element.style.zIndex = '100000';
        this.element.style.background = '#e3d5b8';
        this.element.style.border = '2px solid #804000';
        this.element.style.borderRadius = '5px';
        this.element.style.padding = '5px';
        this.element.style.boxShadow = '0 2px 5px rgba(0,0,0,0.5)';
        this.element.innerHTML = `
            <div style="margin-bottom: 5px; font-weight: bold; text-align: center; color: #4a2100;">Set Status</div>
            <button id="btn_c_off" style="background: #ffcccc; border: 1px solid #cc0000; color: #cc0000; font-weight: bold; padding: 3px 8px; cursor: pointer;">OFF ⚔️</button>
            <button id="btn_c_def" style="background: #ccccff; border: 1px solid #0000cc; color: #0000cc; font-weight: bold; padding: 3px 8px; cursor: pointer;">DEF 🛡️</button>
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
                    <button id="btn_create_group" style="cursor: pointer; background: #ccffcc; border: 1px solid #00cc00; margin-left: 2px; font-weight: bold;">✅</button>
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

        this.element.querySelector('#btn_c_off')?.addEventListener('click', () => this.setStatus('OFF'));
        this.element.querySelector('#btn_c_def')?.addEventListener('click', () => this.setStatus('DEF'));
        this.element.querySelector('#btn_c_none')?.addEventListener('click', () => this.setStatus('NONE'));
        this.element.querySelector('#btn_c_close')?.addEventListener('click', () => this.hide());
        
        this.element.querySelector('#btn_create_group')?.addEventListener('click', () => {
            const input = this.element.querySelector('#new_group_input') as HTMLInputElement;
            const groupName = input.value.trim();
            if (groupName) {
                StorageService.addGroup(groupName);
                input.value = '';
                this.updateGroupSelects();
                
                const playerContainer = this.element.querySelector('#player_group_container') as HTMLElement;
                playerContainer.style.display = 'block';
                
                const villageSelect = this.element.querySelector('#village_group_select') as HTMLSelectElement;
                villageSelect.value = groupName;
                if (this.currentVillageId) {
                    StorageService.setVillageGroup(this.currentVillageId, groupName);
                }
            }
        });

        this.element.querySelector('#player_name_select')?.addEventListener('change', (e) => {
            const select = e.target as HTMLSelectElement;
            const playerName = select.value;
            const villageSelect = this.element.querySelector('#village_group_select') as HTMLSelectElement;
            const currentGroup = villageSelect.value;
            
            if (playerName && currentGroup) {
                StorageService.addPlayerToGroup(playerName, currentGroup);
            }
        });
        
        this.element.querySelector('#village_group_select')?.addEventListener('change', (e) => {
            const select = e.target as HTMLSelectElement;
            const groupName = select.value;
            if (this.currentVillageId) {
                StorageService.setVillageGroup(this.currentVillageId, groupName);
            }
        });

        const handleExport = (isBBCode: boolean) => {
            const groupsData = StorageService.getGroupsData();
            const statusData = StorageService.getAllData();
            
            const lines: string[] = [];
            
            if (isBBCode) {
                lines.push('[table]\n[**]Jugador[||]Coordenadas[||]Grupo[||]Estado[/**]');
            } else {
                lines.push('Jugador\tCoordenadas\tGrupo\tEstado');
            }
            
            for (const [villageId, groupName] of Object.entries(groupsData.villageGroups)) {
                const xyId = parseInt(villageId, 10);
                if (isNaN(xyId)) continue;
                
                const x = Math.floor(xyId / 1000);
                const y = xyId % 1000;
                const coord = `${x}|${y}`;
                
                let playerName = 'Desconocido';
                if (typeof TWMap !== 'undefined' && TWMap.villages && TWMap.villages[villageId]) {
                    const ownerId = TWMap.villages[villageId].owner;
                    if (ownerId && TWMap.players && TWMap.players[ownerId]) {
                        playerName = TWMap.players[ownerId].name;
                    }
                }
                
                const statusInfo = statusData[villageId];
                const tipoJuego = statusInfo ? statusInfo.status : 'NONE';
                
                if (isBBCode) {
                    lines.push(`[*][player]${playerName}[/player][|][coord]${coord}[/coord][|]${groupName}[|]${tipoJuego}`);
                } else {
                    lines.push(`${playerName}\t${coord}\t${groupName}\t${tipoJuego}`);
                }
            }
            
            if (isBBCode) {
                lines.push('[/table]');
            }
            
            const textarea = this.element.querySelector('#bbcode_export_area') as HTMLTextAreaElement;
            textarea.value = lines.length > (isBBCode ? 2 : 1) ? lines.join('\n') : 'No hay pueblos asignados a ningún grupo.';
            textarea.style.display = 'block';
            textarea.select();
        };

        this.element.querySelector('#btn_export_bbcode')?.addEventListener('click', () => handleExport(true));
        this.element.querySelector('#btn_export_text')?.addEventListener('click', () => handleExport(false));
    }

    public onStatusChange(callback: (villageId: string, status: VillageStatus) => void) {
        this.onStatusChangeCallback = callback;
    }

    private setStatus(status: VillageStatus) {
        if (this.currentVillageId) {
            Classifier.setVillageStatus(this.currentVillageId, status);
            if (this.onStatusChangeCallback) {
                this.onStatusChangeCallback(this.currentVillageId, status);
            }
            this.hide();
        }
    }

    private getPlayersFromStorage(): { id: string, name: string }[] {
        if (typeof TWMap === 'undefined') return [];
        const data = StorageService.getAllData();
        const playersMap: Record<string, string> = {};
        
        for (const villageId of Object.keys(data)) {
            const village = TWMap.villages[villageId];
            if (village && village.owner && TWMap.players[village.owner]) {
                playersMap[village.owner] = TWMap.players[village.owner].name;
            }
        }
        
        return Object.keys(playersMap).map(id => ({ id, name: playersMap[id]! }));
    }

    private updateGroupSelects() {
        const groupsData = StorageService.getGroupsData();
        const villageSelect = this.element.querySelector('#village_group_select') as HTMLSelectElement;
        
        const currentVillageVal = villageSelect.value;
        
        villageSelect.innerHTML = '<option value="">-- Assign Village --</option>';
        Object.keys(groupsData.groups).forEach((g: string) => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            villageSelect.appendChild(opt);
        });
        
        if (currentVillageVal && groupsData.groups[currentVillageVal]) {
            villageSelect.value = currentVillageVal;
        }

        const playerSelect = this.element.querySelector('#player_name_select') as HTMLSelectElement;
        playerSelect.innerHTML = '<option value="">-- Select Player --</option>';
        const players = this.getPlayersFromStorage();
        players.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            playerSelect.appendChild(opt);
        });
    }

    public show(villageId: string, x: number, y: number) {
        this.currentVillageId = villageId;
        
        this.updateGroupSelects();
        
        const villageGroup = StorageService.getVillageGroup(villageId);
        const villageSelect = this.element.querySelector('#village_group_select') as HTMLSelectElement;
        villageSelect.value = villageGroup || '';
        
        const playerContainer = this.element.querySelector('#player_group_container') as HTMLElement;
        playerContainer.style.display = 'none';
        
        const textarea = this.element.querySelector('#bbcode_export_area') as HTMLTextAreaElement;
        textarea.style.display = 'none';
        textarea.value = '';
        
        const legend = document.getElementById('map_legend');
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
        
        this.element.style.display = 'block';
    }

    public hide() {
        this.element.style.display = 'none';
        this.currentVillageId = null;
    }
}
