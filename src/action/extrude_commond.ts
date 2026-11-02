import { Polygon } from '../geometry/brep/polygon';
import { ExtrudeBody } from '../algorithm/body_builder/extrude_body';
import { Coordinate3 } from '../math/coordinate3';
import { Vector3 } from '../math/vector3';
import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Loop } from '../geometry/brep/loop';

/**
 *   参数为number[],或者number
 */
class ExtrudeCommand extends Command {

    constructor() {
        super(CommandString.EXTRUDE);
    }

    public execute() {
        const ds = prompt('请输入拉伸高度', '10');
        if (!ds) {
            return;
        }
        const height = Number.parseFloat(ds);

        if (isNaN(height)) {
            return;
        }

        const loops = GeoDocument.getInstance().getAll(Loop);
        if (!loops || loops.length < 1) {
            return undefined;
        }
        const polygon = new Polygon(loops);
        if (polygon.isValid()) {
            const body = ExtrudeBody.create(new Coordinate3(Vector3.zero(), Vector3.unitX(), Vector3.unitY()), polygon, Vector3.unitZ(), height);
            if (body) {
                GeoDocument.getInstance().add(body);
            }
        }
        return undefined;
    }
}

export { ExtrudeCommand };
