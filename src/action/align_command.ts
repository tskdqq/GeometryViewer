import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Selection } from './selection';
import * as xmath from '../xmath';
/**
 *   参数为number[],或者number
 */
class AlignCommand extends Command {

    constructor() {
        super(CommandString.ALIGN);
    }

    public execute() {
        const linesIds = Selection.getInstance().getSelectedIds();
        if (linesIds.length !== 2) {
            return;
        }

        const geos = GeoDocument.getInstance().getGeosById(linesIds);

        if (geos.length !== 2 || !(geos[0] instanceof xmath.Line2d) || !(geos[1] instanceof xmath.Line2d)) {
            return;
        }
        const line1 = geos[0] as xmath.Line2d;
        const line2 = geos[1] as xmath.Line2d;
        if (!line1.isParalellTo(line2)) {
            return;
        }

        const d = xmath.alg.CalculatDistance.ptToCurveSignedDistance(line1.getStartPt(), line2);
        const delta = line1.getDirection().rotate(xmath.MathUtil.PI_2).multi(d);
        const loop = GeoDocument.getInstance().getLoopByCurveId(line1.refId);
        if (loop) {
            loop.translate(delta);
            GeoDocument.getInstance().update(loop);
        } else {
            GeoDocument.getInstance().update(line1);
            line1.translate(delta);
        }

        return undefined;
    }
}

export { AlignCommand };

