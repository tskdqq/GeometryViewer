import { Polyline } from '../../geometry/brep/polyline';
import { Line2d } from '../../geometry/line2d';
import { DebugWarn } from '../../util/debug_warn';
import { Line1ProjectToLine2 } from '../project/line_line_project';
import { Curve2d } from '../../geometry/curve2d';
import { BoolOperateClipper } from './bool_operate_clipper';
import { SearchPolyline } from '../search_graph/search_polyline';
import { MergeUtil } from '../merge_util';
import { Loop } from '../../geometry/brep/loop';
import { Polygon } from '../../geometry/brep/polygon';
import { Interval } from '../../math/interval';
import { GeometryType } from '../../geometry/geometry_type';

export class PolylinePolygonBool {

    /**
     * 布尔运算
     * @param polyline 
     * @param polygon 
     * @param isIntersect 
     */
    public static execute(polyline: Polyline, loopOrPolygons: (Loop | Polygon)[], isIntersect: boolean, isTangentKeep: boolean, _torlerance: number): Polyline[] {
        const torlerance = _torlerance;

        const clippers: Curve2d[] = [];
        loopOrPolygons.forEach(l => {
            clippers.push(...l.copyAllCurves());
        });

        const subject = polyline.copyAllCurves();
        const result: Curve2d[] = [];
        // 所有的非临界线
        const curvesToClipper: Curve2d[] = [];

        for (const cv of subject) {
            const [critical, notCritical] = PolylinePolygonBool.handleCritial(cv, clippers, torlerance);
            if (isIntersect && critical.length && isTangentKeep) {
                critical.forEach((r: Interval) => result.push(cv.clone().setRange(r)));
            }
            notCritical.forEach((r: Interval) => curvesToClipper.push(cv.clone().setRange(r)));
        }

        for (const cv of curvesToClipper) {
            const ptsArr = BoolOperateClipper.curvePolygon(cv, loopOrPolygons, isIntersect);
            // 
            ptsArr.forEach(pts => {
                DebugWarn.assert(pts.length === 2);
                // 临时处理bug
                if (pts[0].distanceTo(pts[1]) > 1e-4) {
                    result.push(new Line2d(pts[0], pts[1]));
                }
            });
        }

        // 搜环
        const polylines = SearchPolyline.execute(result, torlerance);
        return polylines.map(pl => {
            MergeUtil.polyline(pl, torlerance);
            return pl;
        });
    }


    /**
     * 处理临界情况
     * @param cv 
     * @param clippers 
     * @param torlerance 
     */
    private static handleCritial(cv: Curve2d, clippers: Curve2d[], torlerance: number): Interval[][] {
        DebugWarn.assert(cv.getType() === GeometryType.enLine2D, 'only surport line2d');
        const line1 = cv as Line2d;
        const box1 = line1.getBoundingBox();
        const splits: Interval[] = [];
        // 临界区间
        const critical: Interval[] = [];
        // 非临界区间
        const notCritical: Interval[] = [];

        for (const clipper of clippers) {
            const box2 = clipper.getBoundingBox();
            // 包围盒粗判
            if (!box1.intersectsBox(box2, torlerance)) {
                continue;
            }
            DebugWarn.assert(clipper.getType() === GeometryType.enLine2D, 'only surport line2d');
            const line2 = clipper as Line2d;
            if (!line1.isColinearWith(line2, torlerance)) {
                continue;
            }
            // 扣减
            const range = Line1ProjectToLine2.execute(line2, line1);
            const intersection = range.intersect(line1.getRange());
            if (intersection) {
                critical.push(intersection);
                splits.push(range);
            }
        }

        if (!splits.length) {
            notCritical.push(line1.getRange());
        } else {
            const ranges = line1.getRange().sub(...splits);
            if (ranges.length) {
                ranges.forEach(r => {
                    notCritical.push(r);
                });
            }
        }

        return [critical, notCritical];
    }
}
