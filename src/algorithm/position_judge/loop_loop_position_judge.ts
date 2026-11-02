import { Loop } from '../../geometry/brep/loop';
import { Line2d } from '../../geometry/line2d';
import { ErrorSystem } from '../../math/error_system';
import { DebugWarn } from '../../util/debug_warn';
import { LineLoopPositionJudge } from './line_loop_position_judge';
import {
    CurveLoopPositonType, LoopLoopPositonType, PtLoopPositonType
} from './position_judge_type';
import { PtLoopPositionJudge } from './pt_loop_position_judge';
// import { GeometryType } from '../../geometry/geometry_type';

class LoopLoopPositionJudge {

    /**
     * Loop1与Loop2的位置关系判断,以loop2位基准
     * @param loop1 
     * @param loop2 
     * @param tolerance 
     */
    public static execute(loop1: Loop, loop2: Loop, tolerance: number = ErrorSystem.LENGTH_EPS): LoopLoopPositonType {

        DebugWarn.assert(loop1.isValid(), 'Loop is invalid,error');
        DebugWarn.assert(loop1.isAnticlockwise(), 'just support outter loop，please reverse the loop');
        DebugWarn.assert(loop2.isValid(), 'Loop is invalid,error');
        DebugWarn.assert(loop2.isAnticlockwise(), 'just support outter loop，please reverse the loop');

        // 包围盒粗判
        const box1 = loop1.getBoundingBox();
        const box2 = loop2.getBoundingBox();
        if (!box1.intersectsBox(box2, tolerance)) {
            return LoopLoopPositonType.OUT;
        }

        const coedges1 = loop1.getCoedges();
        if (coedges1.length < 3) {
            return LoopLoopPositonType.OUT;
        }

        const types = new Set<CurveLoopPositonType>();
        // 
        for (const ce of coedges1) {
            const type = LineLoopPositionJudge.execute(ce.curve as Line2d, loop2);
            // 相交
            if (type === CurveLoopPositonType.INTERSECT) {
                return LoopLoopPositonType.INTERSECT;
            }
            types.add(type);
        }


        // 内切
        if (types.has(CurveLoopPositonType.TANGENT_INNER)) {
            return LoopLoopPositonType.INTERSECT_TANGENT_INNER;
        }

        // 外切
        if (types.has(CurveLoopPositonType.TANGENT_OUTTER)) {
            return LoopLoopPositonType.INTERSECT_TANGENT_OUTTER;
        }

        // 只有一种类型
        if (types.size === 1) {
            if (types.has(CurveLoopPositonType.ON)) {
                return LoopLoopPositonType.EQUAL;
            }

            if (types.has(CurveLoopPositonType.IN)) {
                return LoopLoopPositonType.IN;
            }

            if (types.has(CurveLoopPositonType.OUT)) {
                // 再在loop2上取一个点判断是否在loop1内部
                const pt = loop2.getCoedges()[0].curve.getStartPt();
                if (PtLoopPositonType.IN === PtLoopPositionJudge.execute(pt, loop1, tolerance, false)) {
                    return LoopLoopPositonType.CONTAIN;
                }

                return LoopLoopPositonType.OUT;
            }
        }


        throw new Error('未知类型');
    }

}

export { LoopLoopPositionJudge };
