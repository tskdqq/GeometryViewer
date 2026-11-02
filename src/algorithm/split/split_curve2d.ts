import { Curve2d } from '../../geometry/curve2d';
import { Line2d } from '../../geometry/line2d';
import { ErrorSystem } from '../../math/error_system';
import { Interval } from '../../math/interval';
import { DebugWarn } from '../../util/debug_warn';
import { LineLineIntersect } from '../intersect/line_line_intersect';
import { LineLinePositionJudge } from '../position_judge/line_line_pj';
import { CurveCuvePositonType } from '../position_judge/position_judge_type';
import { Line1ProjectToLine2 } from '../project/line_line_project';

/**
 * curve2d的打断算法, 打断规则：
 * - 有交
 * - 重叠
 */
class SplitCurve2d {
    public static execute<T extends Curve2d>(curve2d: T, curves: Curve2d[]): T[] {

        DebugWarn.assert(curve2d instanceof Line2d);
        const target = curve2d.clone() as Line2d;
        target.extend(ErrorSystem.MODEL_MAX_LENGTH);
        target.extend(ErrorSystem.MODEL_MAX_LENGTH, false);

        const pts: (number | Interval)[] = [];

        for (const curve of curves) {
            DebugWarn.assert(curve instanceof Line2d);
            const line = curve as Line2d;

            const type = LineLinePositionJudge.execute(target, line);

            // 无需打断
            if (CurveCuvePositonType.NOT_INTERSECT === type ||
                CurveCuvePositonType.OVERLAP_EQUAL === type ||
                CurveCuvePositonType.OVERLAP_IN === type) {
                continue;
            }

            // 求交打断
            if (CurveCuvePositonType.INTERSECT_IN === type ||
                CurveCuvePositonType.INTERSECT_ON === type) {

                const tmpLine = line.clone();
                tmpLine.extend(ErrorSystem.MODEL_MAX_LENGTH);
                tmpLine.extend(ErrorSystem.MODEL_MAX_LENGTH, false);
                const info = LineLineIntersect.line2dAndLine2d(target, tmpLine);
                DebugWarn.assert(info.length === 1);
                pts.push(info[0].param1);
                continue;
            }

            // 投影打断
            const inter = Line1ProjectToLine2.execute(target, line);
            pts.push(inter);
        }

        const ranges = curve2d.getRange().split(...pts);

        return ranges.map(r => {
            return curve2d.clone().setRange(r) as T;
        });
    }
}

export { SplitCurve2d };
