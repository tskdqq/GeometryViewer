import { BrepBody } from '../../geometry/brep/brep_body';
import { Plane } from '../../geometry/plane';
import { BoolOperate3d } from '../bool_operate_3d';
import { Face } from '../../geometry/brep/face';
import { PositionJudge } from '../position_judge';
import { PlaneCutFace } from './plane_cut_face';

/**
 * 平面切割body
 */
export class PlaneCutBody {

    public static execute(body: BrepBody, plane: Plane): BrepBody | undefined {
        const polygon = BoolOperate3d.surfaceIntersectBody(plane, body);
        // 无交点
        if (polygon.isEmpty()) {
            if (PositionJudge.isPtAbovePlane(body.getFaces()[0].getCentroidPoint(), plane)) {
                return body.clone();
            } else {
                return;
            }
        }

        // 补的面
        const patchedFace = new Face(plane, false, polygon);

        const resultFaces: Face[] = [patchedFace];

        for (const f of body.getFaces()) {
            const cf = PlaneCutFace.execute(f, plane);
            if (cf) {
                resultFaces.push(cf);
            }
        }

        const resultBody = new BrepBody();
        resultFaces.forEach(f => resultBody.addFace(f));
        resultBody.calcAndAddEdges();
        return resultBody;
    }
}
