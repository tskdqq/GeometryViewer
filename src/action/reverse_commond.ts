import { GeoDocEventHandler } from '../event_handler/geo_changed_handler';
import { Loop } from '../geometry/brep/loop';
import { Curve } from '../geometry/curve';
import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Selection } from './selection';

/**
 *   参数为number[],或者number
 */
class ReverseCommand extends Command {

    constructor() {
        super(CommandString.REVERSE);
    }

    public execute() {
        const ids = Selection.getInstance().getSelectedIds();
        if (!ids || ids.length < 1) {
            return undefined;
        }

        for (const id of ids) {
            const geo = GeoDocument.getInstance().getGeoById(id);
            if (!geo
                || !(geo instanceof Loop) && !(geo instanceof Curve)) {
                return;
            }
            console.log(geo);

            geo.reverse();

            GeoDocEventHandler.getInstance().onGeoUpdate([geo]);
        }
        return undefined;
    }
}

export { ReverseCommand };
