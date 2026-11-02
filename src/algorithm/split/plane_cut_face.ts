import { Plane } from '../../geometry/plane';
import { Face } from '../../geometry/brep/face';
import { PositionJudge } from '../position_judge';
import { SurfaceSurfaceIntersect } from '../intersect/surface_surface_intersect';
import { DebugWarn } from '../../util/debug_warn';
import { Loop } from '../../geometry/brep/loop';
import { BoolOperate2d } from '../bool_operate_2d';
import { MathUtil } from '../../util/math_util';
import { ErrorSystem } from '../../math/error_system';

/**
 * 平面切割face,留plane法向的一侧
 */
export class PlaneCutFace {

    public static execute(f: Face, plane: Plane): Face | undefined {

        const intLines = SurfaceSurfaceIntersect.execute(f.getSurface(), plane);
        // 平行，没有交线
        if (!intLines.length) {
            if (PositionJudge.isPtAbovePlane(f.getCentroidPoint(), plane)) {
                return f.clone();
            }
            return;
        }
        DebugWarn.assert(intLines.length === 1);
        // 有交线，直接切割face
        const intLine = intLines[0];
        const intLine2d = f.getSurface().getCurve2d(intLine)!;

        const testPt2d = intLine2d.getMidPt()
            .add(intLine2d.getStartTangent().rotate(MathUtil.PI_2).multi(1));
        const testPt3d = f.getSurface().getPtAt(testPt2d);

        intLine2d.extendDouble(ErrorSystem.MODEL_MAX_LENGTH);
        const another = intLine2d.clone();
        // 向左偏移
        if (PositionJudge.isPtAbovePlane(testPt3d, plane)) {
            another.offset(-ErrorSystem.MODEL_MAX_LENGTH);
        } else {
            // 向右偏移
            another.offset(ErrorSystem.MODEL_MAX_LENGTH);
        }
        another.reverse();

        const loop = new Loop([intLine2d.getStartPt(), intLine2d.getEndPt(), another.getStartPt(), another.getEndPt()]);
        if (!loop.isAnticlockwise()) {
            loop.reverse();
        }

        const newPolygon = BoolOperate2d.intersect([f.getPolygon(), loop]);
        if (newPolygon.isEmpty()) {
            return;
        }
        return f.clone().setPolygon(newPolygon);
    }
}
