import { Loop } from '../geometry/brep/loop';
import { Curve2d } from '../geometry/curve2d';
import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Selection } from './selection';

/**
 *   参数为number[],或者number
 */
class OffsetCommand extends Command {

    constructor() {
        super(CommandString.OFFSET);
    }

    public execute() {
        const ids = Selection.getInstance().getSelectedIds();
        if (ids && ids.length > 0) {
            for (const id of ids) {
                const geo = GeoDocument.getInstance().getGeoById(id);
                if (!geo) {
                    return;
                }

                const geoCopy = geo.clone();
                if (geoCopy instanceof Loop) {
                    geoCopy.offset(50);
                } else if (geoCopy instanceof Curve2d) {
                    geoCopy.offset(50);
                }

                GeoDocument.getInstance().add(geoCopy);
            }
        }
        return undefined;
    }
}

export { OffsetCommand };
