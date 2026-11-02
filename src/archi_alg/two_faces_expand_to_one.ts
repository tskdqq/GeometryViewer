import { Face } from '../geometry/brep/face';
import { DebugWarn } from '../util/debug_warn';
import { FaceProject } from '../algorithm/project/face_project';
import { Plane } from '../geometry/plane';
import { Polygon } from '../geometry/brep/polygon';
import { Loop } from '../geometry/brep/loop';
import { PositionJudge, BoolOperate2d } from '../algorithm';
import { Line1ProjectToLine2 } from '../algorithm/project/line_line_project';
import { Line2d } from '../geometry/line2d';
import { PtToLineSignedDistance } from '../algorithm/distance/pt_to_line_signed_distance';

/**
 * 多个face通过延展，合并成1个，用于完成面的合并
 */
export class TwoFacesExpandToOne {

    /**
     * 要求2个face有平行的边，且距离小于distanceEps，默认值1mm
     * @param face1 
     * @param face2 
     */
    public static execute(face1: Face, face2: Face, distanceEps = 1e-3): Face | undefined {
        DebugWarn.assert(face1.getPolygon().getLoops().length === 1 && face2.getPolygon().getLoops().length === 1, '暂时只处理单个环的face');
        if (!face1.getCenterNorm().isParalellTo(face2.getCenterNorm())) {
            return;
        }

        const polygon1 = face1.getPolygon();
        // face2向face1投影
        const polygon2 = FaceProject.execute(face2, (face1.getSurface() as Plane).toCoordinate()) as Polygon;
        DebugWarn.assert(polygon2 instanceof Polygon, '投影成了一条线?');

        const polygon = TwoFacesExpandToOne.twoLoopsExpandToOne(polygon1.getLoops()[0].clone(), polygon2.getLoops()[0].clone(), distanceEps);
        if (!polygon) {
            return;
        }

        const newFace = face1.clone();
        newFace.setPolygon(polygon);
        return newFace;
    }


    public static twoLoopsExpandToOne(polygon1: Loop, polygon2: Loop, distanceEps: number): Polygon | undefined {
        // 布尔运算后单个环直接返回
        let polygon = BoolOperate2d.union([polygon1, polygon2]);
        if (polygon.getLoops().length === 1) {
            return polygon;
        }

        const curve1 = polygon1.getAllCurves();
        const curve2 = polygon2.getAllCurves();

        const ijDistances: { i: number; j: number; d: number }[] = [];

        for (let i = 0; i < curve1.length; i++) {
            const cv1 = curve1[i] as Line2d;
            for (let j = 0; j < curve2.length; j++) {
                const cv2 = curve2[j] as Line2d;
                // 平行
                if (!cv1.getStartTangent().isParalellTo(cv2.getStartTangent())) {
                    continue;
                }
                // 在外部
                if (!PositionJudge.isPtOnCurveRight(cv1.getMidPt(), cv2) || !PositionJudge.isPtOnCurveRight(cv2.getMidPt(), cv1)) {
                    continue;
                }
                // 有公共部分
                const intRange = Line1ProjectToLine2.execute(cv2, cv1).intersect(cv1.getRange());
                if (!intRange || intRange.getLength() < 0.3) {
                    continue;
                }

                const d = Math.abs(PtToLineSignedDistance.ptToLine2d(cv1.getMidPt(), cv2));

                if (d < distanceEps) {
                    ijDistances.push({ i, j, d });
                }
            }
        }

        if (!ijDistances.length) {
            return;
        }

        for (const { i, j, d } of ijDistances) {
            curve1[i].offset(d);
            curve2[j].offset(d);
        }

        polygon1.makeStartEndConnected();
        polygon2.makeStartEndConnected();


        polygon = BoolOperate2d.union([polygon1, polygon2]);
        return polygon;
    }

}
