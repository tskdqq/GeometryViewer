import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Selection } from './selection';
import { DebugWarn } from '../util/debug_warn';
import * as xmath from '../xmath';


/**
 *   参数为number[],或者number
 */
class BoolSubtractCommand extends Command {

    constructor() {
        super(CommandString.BOOLSUBTRACT);
    }

    private async boolIntersect(body1: xmath.BrepBody, body2: xmath.BrepBody) {
        const occSolid = new xmath.occ.TransQMathTOCC(body1).run();
        const occSolid2 = new xmath.occ.TransQMathTOCC(body2).run();
        const data = {
            blankBody: occSolid,
            toolBody: occSolid2
        };

        // 调用pythonOCC实现体的布尔运算
        const response = await fetch('http://114.55.146.181:8080/boolSubtract', {
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });

        response.json().then(r => {
            const resultBody = new xmath.occ.TransOccToQMath().run(r);
            console.log(resultBody.asString());
            GeoDocument.getInstance().add(resultBody);
        });
    }

    public execute() {
        const ids = Selection.getInstance().getSelectedIds();
        if (!ids || ids.length !== 2) {
            DebugWarn.warn(false, 'BoolOperation body size should be Two !.');
            return undefined;
        }

        const geo1 = GeoDocument.getInstance().getGeoById(ids[0]);
        const geo2 = GeoDocument.getInstance().getGeoById(ids[1]);
        if (!geo1 || !geo2
            || !(geo1 instanceof xmath.BrepBody) || !(geo1 instanceof xmath.BrepBody)) {
            return undefined;
        }

        const body1 = geo1 as xmath.BrepBody;
        const body2 = geo2 as xmath.BrepBody;
        console.log(body1);
        console.log(body2);
        this.boolIntersect(body1, body2);
        return undefined;
    }
}

export { BoolSubtractCommand };
