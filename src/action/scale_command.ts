import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Selection } from './selection';
import { Vector3 } from '../math/vector3';

/**
 *   参数为number[],或者number
 */
class ScaleCommand extends Command {

    constructor() {
        super(CommandString.SCALE);
    }

    public execute() {
        const linesIds = Selection.getInstance().getSelectedIds();
        if (linesIds.length < 1) {
            return;
        }

        const geos = GeoDocument.getInstance().getGeosById(linesIds);

        if (geos.length < 1) {
            return;
        }
        for (const geo of geos) {
            geo.scale(5, new Vector3(0, 0, 0));
        }
        GeoDocument.getInstance().update(...geos);

        return undefined;
    }
}

export { ScaleCommand };
