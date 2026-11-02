import { Loop } from '../../geometry/brep/loop';
import * as ClipperLib from '../../lib/clipperlib/clipperlib';
import { Vector2 } from '../../math/vector2';
import { XY } from '../../math/xy';
import { ClipperFormatConverter } from '../../util/clipper_format_converter';
import { LoopTreeNode } from './loop_tree_node';
import { DiscreteUtil } from '../discrete_util';

/**
 * 根据包含关系，将loop[]，组成polygon
 */
class LoopsToLoopTreeSearchGraph {

    public static scale = 1e5;

    /**
     * 根据包含关系，将loop[]，组成polygon
     * @param curve 
     * @param polygon 
     */
    public static execute(loops: Loop[]): LoopTreeNode {
        //  将圆弧离散成直线（ClipperLib在构建环的包含关系树的时候不能有圆弧）
        const paths = loops.map(loop => {
            const discretept = DiscreteUtil.discretePolyline(loop, 0.0001);
            return ClipperFormatConverter.vector2sToXY(discretept);
        });

        ClipperLib.JS.ScaleUpPaths(paths, LoopsToLoopTreeSearchGraph.scale);
        const cpr = new ClipperLib.Clipper();
        cpr.AddPaths(paths, ClipperLib.PolyType.ptClip, true);
        cpr.AddPath([], ClipperLib.PolyType.ptSubject, true);

        // 布尔并
        const polytree: ClipperLib.PolyTree = new ClipperLib.PolyTree();
        cpr.Execute(ClipperLib.ClipType.ctUnion, polytree);

        // 父节点的数据域为空
        const origins = loops.map(l => {
            return LoopsToLoopTreeSearchGraph.ptsToKey(l.toPath());
        });

        // 
        const root = LoopsToLoopTreeSearchGraph.polyTreeToLoopTree(polytree, undefined, origins, [...loops]);

        return root;
    }


    private static ptToKey(pt: Vector2) {
        const p = pt.clone().multi(LoopsToLoopTreeSearchGraph.scale);
        const s2 = `${Math.round(p.x)}_${Math.round(p.y)}`;
        return s2;
    }

    private static ptsToKey(pts: XY[]) {
        let s1 = '';
        pts.forEach(p => {
            s1 += LoopsToLoopTreeSearchGraph.ptToKey(new Vector2(p)) + ',';
        });
        return s1;
    }

    private static polyTreeToLoopTree(node: ClipperLib.PolyNode, parent: LoopTreeNode | undefined, originLoops: string[], loops: Loop[]): LoopTreeNode {
        const curNode = new LoopTreeNode();
        if (parent) {
            parent.addToChild(curNode);
        }

        if (node.m_polygon && node.m_polygon.length > 0) {
            const _loop = ClipperFormatConverter.pathToLoop(node.m_polygon);
            const loop = LoopsToLoopTreeSearchGraph.findLoop(_loop, originLoops, loops);
            if (_loop.isAnticlockwise() !== loop.isAnticlockwise()) {
                loop.reverse();
            }
            curNode.data = loop;
        }

        if (!node.m_Childs || node.m_Childs.length < 1) {
            return curNode;
        }

        for (const child of node.m_Childs) {
            LoopsToLoopTreeSearchGraph.polyTreeToLoopTree(child, curNode, originLoops, loops);
        }

        return curNode;
    }

    /**
     * clipper布尔运算时会自动合并边，并且会圆整整数，因此采用一个点去拓扑追踪原来的环
     * @param path 
     * @param originLoops 
     * @param loops 
     */
    private static findLoop(path: Loop, originLoops: string[], loops: Loop[]): Loop {
        const scale1 = 1 / LoopsToLoopTreeSearchGraph.scale;
        const _l = path.toPath().map(p => p.scale(scale1));

        // 最多的次数
        const cnts: number[] = [];
        loops.forEach(_ => cnts.push(0));

        for (const xy of _l) {
            const p = xy;
            // tslint:disable-next-line: prefer-template
            const s = ',' + LoopsToLoopTreeSearchGraph.ptToKey(p) + ',';
            originLoops.forEach((loop, idx) => {
                if (loop.includes(s)) {
                    cnts[idx]++;
                }
            });
        }
        const max = Math.max(...cnts);
        if (max === 0) {
            throw new Error('cant find, bug!!');
        }

        const index = cnts.findIndex(i => {
            return i === max;
        });
        originLoops.splice(index, 1);
        const result = loops.splice(index, 1);
        return result[0];
    }
}
export { LoopsToLoopTreeSearchGraph };
