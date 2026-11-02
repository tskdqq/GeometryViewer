import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import * as xmath from '../xmath';

/**
 *   参数为number[],或者number
 */
class MirrorCommand extends Command {

    constructor() {
        super(CommandString.MIRROR);
    }

    public execute() {
        const loops = GeoDocument.getInstance().getAll(xmath.Loop);
        const line2ds = GeoDocument.getInstance().getAll(xmath.Line2d);
        if (loops.length && line2ds.length) {
            const matrix = new xmath.Matrix3().applyMirror(line2ds[0].getOrigin(), line2ds[0].getDirection());
            const newLoop = loops[0].clone().applyTransform(matrix);
            GeoDocument.getInstance().add(newLoop);
        }
        return undefined;
    }
}

export { MirrorCommand };

