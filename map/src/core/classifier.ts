import { StorageService } from '../data/storage';
import type { VillageStatus } from '../data/storage';

export class Classifier {
    static getVillageStatus(villageId: string): VillageStatus {
        const data = StorageService.getVillageData(villageId);
        return data ? data.status : 'NONE';
    }

    static setVillageStatus(villageId: string, status: VillageStatus) {
        StorageService.setVillageStatus(villageId, status);
    }
}
