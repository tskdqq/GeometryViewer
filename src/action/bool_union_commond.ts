import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { CommandString } from './command_string';
import { Selection } from './selection';
import * as xmath from '../xmath';
import { BrepBody } from '../geometry/brep/brep_body';


/**
 *   参数为number[],或者number
 */
class BoolUnionCommand extends Command {

    constructor() {
        super(CommandString.BOOLUNION);
    }

    private async boolUnion(bodies: xmath.BrepBody[]) {
        const occSolids = [];
        for (const body of bodies) {
            const occSolid = new xmath.occ.TransQMathTOCC(body).run();
            occSolids.push(occSolid);
        }
        const data = {
            bodies: occSolids,
            isMerge: true
        };

        // 调用pythonOCC实现体的布尔运算
        const response = await fetch('http://114.55.146.181:8080/unionsNoTopo', {
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        });

        response.json().then(r => {
            for (const info of r) {
                const resultBody = new xmath.occ.TransOccToQMath().run(info);
                console.log(resultBody.asString());
                GeoDocument.getInstance().add(resultBody);
            }
        });
    }

    public execute() {
        const ids = Selection.getInstance().getSelectedIds();
        const geos: xmath.BrepBody[] = [];
        if (ids.length) {
            for (const id of ids) {
                const geo = GeoDocument.getInstance().getGeoById(id);
                if (!geo || !(geo instanceof xmath.BrepBody)) {
                    continue;
                }
                geos.push(geo);
            }
        }
        if (!geos.length) {
            geos.push(...GeoDocument.getInstance().getAll(BrepBody));
        }
        this.boolUnion(geos);
        return undefined;
    }
}

export { BoolUnionCommand };
