import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { MeasureHouse } from '../archi_alg/mesure_house';
import { Loop } from '../geometry/brep/loop';
import { MathUtil } from '../util/math_util';

/**
 *   参数为number[],或者number
 */
class MouseHouseCommand extends Command {

    constructor() {
        super(CommandString.MESURE_HOUSE);
    }

    public execute() {
        const loops = GeoDocument.getInstance().getAll(Loop);
        const result = MeasureHouse.execute(loops, 0.24, 0.24 * 3, MathUtil.degreeToRadius(2));
        GeoDocument.getInstance().add(result);
        return undefined;
    }
}

export { MouseHouseCommand };

