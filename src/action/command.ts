import { ActionBase } from './actionbase';

/**
 *  
 */
class Command {

    constructor(protected readonly cmdId: string) {
    }

    public getCmdId() {
        return this.cmdId;
    }

    public execute(cmdParam?: any): ActionBase | undefined {
        return;
    }
}

export { Command };
