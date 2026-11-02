import { Polyline } from '../../geometry/brep/polyline';
import { Curve2d } from '../../geometry/curve2d';
import { Line2d } from '../../geometry/line2d';
import { SplitCurve2d } from './split_curve2d';
import { Coedge } from '../../geometry/brep/coedge';
import { UUIDUtil } from '../../util/uuid_util';

/**
 * Polyline和Loop的打断算法, 打断规则：
 * - 有交
 * - 重叠
 */
class SplitPolyline {

    /**
     * 会改变polyline本身
     * @param polyline [in out]
     * @param curves 
     */
    public static execute(polyline: Polyline, curves: Curve2d[]) {
        const tmp: Coedge[] = [];
        for (const ce of polyline.getCoedges()) {
            const results = SplitCurve2d.execute(ce.curve as Line2d, curves);
            results.forEach(r => {
                const newCoedge = ce.clone();
                newCoedge.curve = r;
                ce.tag = UUIDUtil.generateShort();
                tmp.push(newCoedge);
                // const newCoedge = tmp.addCurve(r);
                // newCoedge.topoTrack.type = TopoTrackType.SPLIT;
                // newCoedge.topoTrack.ids = [ce.tag];
            });
        }

        polyline.clear();
        polyline.getCoedges().push(...tmp);
    }
}

export { SplitPolyline };
