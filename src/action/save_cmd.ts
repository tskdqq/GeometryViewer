import { Command } from './command';
import { CommandString } from './command_string';
import { GeoDocument } from '../ui/geo_document';
import { LogUtil } from '../util/log_util';

/**
 *   参数为number[],或者number
 */
class SaveCommand extends Command {

    constructor() {
        super(CommandString.SAVE);
    }

    public execute() {
        const btn = document.getElementById('copyAllStringBtn');
        if (btn) {
            btn.click();
        }

        const storage = window.localStorage;
        storage.setItem('doc', LogUtil.asString(GeoDocument.getInstance().getAllData()));
        return undefined;
    }
}

export { SaveCommand };
