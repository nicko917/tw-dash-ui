export type VillageStatus = 'OFF' | 'DEF' | 'NONE';

export interface VillageData {
    status: VillageStatus;
    updatedAt: number;
}

export class StorageService {
    private static readonly STORAGE_KEY = 'TW_OFF_DEF_MARKER_DATA';

    static getAllData(): Record<string, VillageData> {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Failed to parse TW_OFF_DEF_MARKER_DATA', e);
            return {};
        }
    }

    static getVillageData(villageId: string): VillageData | null {
        const data = this.getAllData();
        return data[villageId] || null;
    }

    static setVillageStatus(villageId: string, status: VillageStatus) {
        const data = this.getAllData();
        if (status === 'NONE') {
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
    private static readonly GROUPS_KEY = 'TW_OFF_DEF_MARKER_GROUPS';

    static getGroupsData() {
        try {
            const data = localStorage.getItem(this.GROUPS_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                // Migration from old array format to object format
                if (Array.isArray(parsed.groups)) {
                    const newGroups: Record<string, {color: string}> = {};
                    parsed.groups.forEach((g: string) => {
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

    private static getRandomColor(): string {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `rgba(${r}, ${g}, ${b}, 0.4)`;
    }

    static saveGroupsData(data: any) {
        localStorage.setItem(this.GROUPS_KEY, JSON.stringify(data));
    }

    static addGroup(groupName: string) {
        const data = this.getGroupsData();
        if (!data.groups[groupName]) {
            data.groups[groupName] = { color: this.getRandomColor() };
            this.saveGroupsData(data);
        }
    }

    static setVillageGroup(villageId: string, groupName: string) {
        const data = this.getGroupsData();
        if (groupName) {
            data.villageGroups[villageId] = groupName;
        } else {
            delete data.villageGroups[villageId];
        }
        this.saveGroupsData(data);
    }

    static addPlayerToGroup(playerName: string, groupName: string) {
        const data = this.getGroupsData();
        if (!data.playerGroups[playerName]) {
            data.playerGroups[playerName] = [];
        }
        if (!data.playerGroups[playerName].includes(groupName)) {
            data.playerGroups[playerName].push(groupName);
            this.saveGroupsData(data);
        }
    }

    static getVillageGroup(villageId: string): string | null {
        return this.getGroupsData().villageGroups[villageId] || null;
    }
}
