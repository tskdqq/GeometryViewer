import { Loop } from '../../geometry/brep/loop';
import { Polygon } from '../../geometry/brep/polygon';
import { PtLoopPositionJudge } from '../position_judge/pt_loop_position_judge';
import { PtLoopPositonType, LoopLoopPositonType } from '../position_judge/position_judge_type';
import { LoopsToLoopTreeSearchGraph } from './loops_to_loop_tree_search_graph';
import { LoopLoopPositionJudge } from '../position_judge/loop_loop_position_judge';
import { DebugWarn } from '../../util/debug_warn';

/**
 * 环变成PolygonEx
 */
export class LoopsToPolygonExes {
    /**
     * 根据包含关系，将loop[]，组成polygonEx
     * @param loops 
     * @returns polygon[]
     */
    public static execute(_loops: Loop[]): Polygon[] {
        const result: Polygon[] = [];

        if (!_loops.length) {
            return result;
        }

        // 变成逆时针loop
        const candidates = _loops.map(_ => {
            const l = _.clone();
            if (!l.isAnticlockwise()) {
                l.reverse();
            }
            return l;
        });

        const hasTested: Set<string> = new Set();

        // 1.切割孤立的loop
        for (let i = 0; i < candidates.length; i++) {
            const loop1 = candidates[i];
            // 已经检测过
            if (hasTested.has(loop1.tag)) {
                continue;
            }
            const test1 = loop1.getCoedges()[0].curve.getMidPt();

            let find = false;

            for (let j = 0; j < candidates.length; j++) {
                if (i === j) {
                    continue;
                }
                const loop2 = candidates[j];
                const test2 = loop2.getCoedges()[0].curve.getMidPt();

                if (PtLoopPositionJudge.execute(test1, loop2) === PtLoopPositonType.IN
                    || PtLoopPositionJudge.execute(test2, loop1) === PtLoopPositonType.IN
                ) {
                    find = true;
                    hasTested.add(loop1.tag);
                    hasTested.add(loop2.tag);
                    break;
                }
            }
            if (find) {
                continue;
            }
            // 单个环可作为
            result.push(new Polygon(loop1));
            candidates.splice(i, 1);
            i--;
        }

        // 2.处理包含关系
        if (candidates.length === 2) {
            const loop0 = candidates[0].clone();
            const loop1 = candidates[1].clone();
            const type = LoopLoopPositionJudge.execute(loop0, loop1);
            if (type === LoopLoopPositonType.CONTAIN) {
                result.push(new Polygon([candidates[0], candidates[1].reverse()]));
                return result;
            } else if (type === LoopLoopPositonType.IN) {
                result.push(new Polygon([candidates[1], candidates[0].reverse()]));
                return result;
            } else {
                DebugWarn.assert('不该到此处');
            }
        }
        const tree = LoopsToLoopTreeSearchGraph.execute(candidates);
        const result2: Polygon[] = [];
        tree.collectNewPolygonExes(result2);
        result.push(...result2);
        return result;
    }
}
