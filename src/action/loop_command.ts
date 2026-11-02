import { SearchGraph } from '../algorithm';
import { Loop } from '../geometry/brep/loop';
import { Polyline } from '../geometry/brep/polyline';
import { Line2d } from '../geometry/line2d';
import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Selection } from './selection';
import { Curve2d } from '../geometry/curve2d';

/**
 *   参数为number[],或者number
 */
class LoopCommand extends Command {

    constructor() {
        super(CommandString.LOOP);
    }

    public execute() {
        let lines: Line2d[] = [];
        const linesIds = Selection.getInstance().getSelectedIds();

        if (linesIds.length > 0) {
            const line = GeoDocument.getInstance().getGeoById(linesIds[linesIds.length - 1]);
            if (line instanceof Polyline) {
                GeoDocument.getInstance().deleteById(line.refId);
                const ls = line.getCoedges().map(ce => {
                    return ce.curve;
                });
                GeoDocument.getInstance().add(ls);
                return;
            }
        }

        for (const id of linesIds) {
            const line = GeoDocument.getInstance().getGeoById(id);
            if (line instanceof Line2d) {
                lines.push(line);
            }
        }

        if (lines.length > 1) {
            // 
            const loop = new Loop();
            // for (let i = 1; i < lines.length; i++) {
            //     const pre = lines[i - 1];
            //     const cur = lines[i];
            //     if(cur.getStartPt().sqDistanceTo(pre.gets))
            // }
            lines.forEach(l => loop.addCurve(l));
            loop.makeStartEndConnected();
            if (!loop.isAnticlockwise()) {
                loop.reverse();
            }
            GeoDocument.getInstance().add(loop);
        } else {
            lines = GeoDocument.getInstance().getAll(Curve2d as any);
            if (!lines || lines.length < 1) {
                return;
            }
            // const loops = SearchGraph.simpleHole(lines);
            const loops = SearchGraph.simpleLoop(lines);
            GeoDocument.getInstance().add(loops);

        }

        const ids = lines.map(l => {
            return l.refId;
        });
        GeoDocument.getInstance().deleteById(...ids);
        return undefined;
    }
}

export { LoopCommand };
