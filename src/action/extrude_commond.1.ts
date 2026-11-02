import { Coordinate3 } from '../math/coordinate3';
import { Vector3 } from '../math/vector3';
import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Polyline } from '../geometry/brep/polyline';
import { ShellBuilder } from '../algorithm/shell_builder';

/**
 *   参数为number[],或者number
 */
export class ExtrudeShellCommand extends Command {

    constructor() {
        super(CommandString.EXTRUDE_SHELL);
    }

    public execute() {
        const loops = GeoDocument.getInstance().getAll(Polyline);
        if (!loops || loops.length < 1) {
            return undefined;
        }
        if (loops[0].isValid()) {
            const body = ShellBuilder.create(new Coordinate3(Vector3.zero(), Vector3.unitX(), Vector3.unitY()), loops[0], Vector3.unitZ(), 10);
            if (body) {
                GeoDocument.getInstance().add(body);
            }
        }
        return undefined;
    }
}
