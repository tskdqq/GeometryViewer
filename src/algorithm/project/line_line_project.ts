import { Line2d } from '../../geometry/line2d';
import { Interval } from '../../math/interval';
import { Line3d } from '../../geometry/line3d';
import { DebugWarn } from '../../util/debug_warn';
import { GeometryType } from '../../geometry/geometry_type';

/**
 * line1向line2投影，返回一个区间，该区间代表投影后的线在line2参数域上的区间
 */
class Line1ProjectToLine2 {
    public static execute(line1: Line2d | Line3d, line2: Line2d | Line3d): Interval {
        DebugWarn.assert((line1.getType() === GeometryType.enLine2D) && (line2.getType() === GeometryType.enLine2D)
            || (line1.getType() === GeometryType.enLine3D) && (line2.getType() === GeometryType.enLine3D));

        const r1 = (line2 as any).getParamAt(line1.getStartPt());
        const r2 = (line2 as any).getParamAt(line1.getEndPt());
        return new Interval(r1, r2, true);
    }
}

export { Line1ProjectToLine2 };
