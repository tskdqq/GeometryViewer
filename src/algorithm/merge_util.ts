import { Polyline } from '../geometry/brep/polyline';
import { ErrorSystem } from '../math/error_system';
import { Line2d } from '../geometry/line2d';
import { DebugWarn } from '../util/debug_warn';
import { GeometryType } from '../geometry/geometry_type';

/**
 * 几何元素求交，线线求交，线面求交
 */
export class MergeUtil {

    /**
     * 曲线与曲线的交点，目前只支持Line2d与Line2d的交点,
     * 若两曲线重合，则交点为重合段内的某个交点
     * @param curve1 
     * @param curve2 
     * @param extraInfo [out]如果需要知道交点的额外信息（交点在各个曲线上的参数），则传入该参数,
     */
    public static polyline(polyline: Polyline, toleranceToRemove: number = ErrorSystem.LENGTH_EPS) {
        const ces = polyline.getCoedges();
        if (ces.length < 2) {
            return;
        }

        // 1.先去掉过短的干扰线
        // for (let i = 0; i < ces.length; i++) {
        //     if (ces[i].curve.getLength() < toleranceToRemove) {
        //         ces.splice(i, 1);
        //     }
        // }
        // 2.共线合并
        let preIdx: number = 0;
        for (let i = 1; i < ces.length;) {
            const cur = ces[i].curve as Line2d;
            DebugWarn.assert(cur.getType() === GeometryType.enLine2D);
            const pre = ces[preIdx].curve as Line2d;
            if (cur.isColinearWith(pre)) {
                // 可以合并
                ces[preIdx].curve = new Line2d(pre.getStartPt(), cur.getEndPt());
                ces.splice(i, 1);
            } else {
                preIdx = i;
                i++;
            }
        }
        // 3.所有的线相连
    }
}
