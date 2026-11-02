import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import * as xmath from '../xmath';
import { Line2d } from '../geometry/line2d';
/**
 *   参数为number[],或者number
 */
class ConvexHullCommand extends Command {
    constructor() {
        super(CommandString.CONVEX_HULL);
    }

    public execute() {
        const loops = GeoDocument.getInstance().getAll(Line2d);
        if (!loops || loops.length < 1) {
            return undefined;
        }
        const pts: xmath.Vector2[] = [];
        loops.forEach(l => {
            pts.push(l.getStartPt());
            pts.push(l.getEndPt());
        });
        const result = xmath.alg.SearchGraph.ptsToConvexHull(pts);
        GeoDocument.getInstance().add(new xmath.Loop(result));
        return undefined;
    }
}

export { ConvexHullCommand };

