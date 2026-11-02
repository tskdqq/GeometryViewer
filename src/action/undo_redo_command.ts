import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';

/**
 *  
 */
class UndoRedoCommand extends Command {

    constructor() {
        super(CommandString.UNDO_REDO);
    }

    public execute(cmdParam?: any) {
        if (cmdParam) {
            GeoDocument.getInstance().undo();
        } else {
            GeoDocument.getInstance().redo();
        }
        return undefined;
    }
}

export { UndoRedoCommand };
