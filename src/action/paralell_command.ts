import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Selection } from './selection';
import { Line2d } from '../geometry/line2d';
import { MathUtil } from '../util/math_util';

/**
 *   参数为number[],或者number
 */
class ParalellCommand extends Command {

    constructor() {
        super(CommandString.PARALELL);
    }

    public execute() {
        const lines = Selection.getInstance().getSelectedIds();
        if (!lines || lines.length < 2) {
            return undefined;
        }
        const line1 = GeoDocument.getInstance().getGeoById(lines[0]);
        const line2 = GeoDocument.getInstance().getGeoById(lines[1]);
        if (!(line1 instanceof Line2d) || !(line2 instanceof Line2d)) {
            return;
        }

        const dir1 = line1.getDirection();
        const dir2 = line2.getDirection();

        const angle = dir1.angleTo(dir2);

        // 反向
        if (angle > MathUtil.PI_2 && angle < MathUtil.PI_2 * 3) {
            line2.setDirection(dir1.reverse());
        } else {
            line2.setDirection(dir1);
        }

        GeoDocument.getInstance().update(line2);

        return undefined;
    }
}

export { ParalellCommand };

