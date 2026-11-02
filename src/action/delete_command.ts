import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Selection } from './selection';

/**
 *   参数为number[],或者number
 */
class DeleteCommand extends Command {

    constructor() {
        super(CommandString.DELETE);
    }

    public execute() {
        const ids = Selection.getInstance().getSelectedIds();
        if (ids && ids.length > 0) {
            for (const id of ids) {
                GeoDocument.getInstance().deleteById(id);
            }
        }
        return undefined;
    }
}

export { DeleteCommand };
