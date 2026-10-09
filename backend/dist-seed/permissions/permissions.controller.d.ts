import { PermissionsService } from './permissions.service.js';
import type { RoleMatrix } from './permissions.service.js';
export declare class PermissionsController {
    private readonly permissionsService;
    constructor(permissionsService: PermissionsService);
    findAll(): Promise<RoleMatrix>;
    update(body: RoleMatrix): Promise<RoleMatrix>;
}
