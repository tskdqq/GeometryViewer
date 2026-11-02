import { Loop } from '../geometry/brep/loop';
import { Polygon } from '../geometry/brep/polygon';
import { XY } from '../math/xy';
import { LoopTreeNode } from './search_graph/loop_tree_node';
import { LoopsToLoopTreeSearchGraph } from './search_graph/loops_to_loop_tree_search_graph';
import { SearchConvexHull } from './search_graph/search_convex_hull';
import { Vector2 } from '../math/vector2';
import { Curve2d } from '../geometry/curve2d';
import { Polyline } from '../geometry/brep/polyline';
import { SearchPolyline } from './search_graph/search_polyline';
import { GeometryType } from '../geometry/geometry_type';
import { Curve3d } from '../geometry/curve3d';
import { ErrorSystem } from '../math/error_system';
import { LoopsToPolygonExes } from './search_graph/loops_polygonex';

/**
 * 搜索算法：搜环，搜polygon，搜洞
 */
class SearchGraph {

    /**
     * 搜索简单环
     * @param curves 
     * @param polygon 
     */
    public static simpleLoop(curves: Curve2d[]): (Polyline | Loop)[] {
        return SearchPolyline.execute(curves);
    }

    /**
     * 搜索首尾相连的多段线
     * @param curves 
     * @param polygon 
     */
    public static simpleWire(inputCurve3ds: Curve3d[], tolerance = ErrorSystem.LENGTH_EPS): Curve3d[][] {
        const resultWire: Curve3d[][] = [];

        if (inputCurve3ds.length < 1) {
            return [];
        }

        if (inputCurve3ds.length === 1) {
            resultWire.push([inputCurve3ds[0].clone()]);
            return resultWire;
        }

        const curWire: Curve3d[] = [];
        const curves = [...inputCurve3ds];
        // 去除过短（小于容差）的边
        for (let index = 0; index < curves.length; index++) {
            if (curves[index].getLength() < tolerance) {
                curves.splice(index, 1);
            }
        }

        while (curves.length > 0) {
            curWire.push(curves[0]);
            curves.splice(0, 1);

            // find next
            while (curves.length > 0) {
                const next = SearchPolyline.findAndRemoveNextCurve(curWire[curWire.length - 1].getEndPt(), curves, tolerance);
                if (next) {
                    curWire.push(next as Curve3d);
                } else {
                    break;
                }
            }
            // find pre
            while (curves.length > 0) {
                const pre = SearchPolyline.findAndRemoveNextCurve(curWire[0].getStartPt(), curves, tolerance);
                if (pre) {
                    curWire.splice(0, 0, (pre as Curve3d).reverse());
                } else {
                    break;
                }
            }

            resultWire.push(curWire.slice(0));
            curWire.splice(0, curWire.length);
        }

        return resultWire;
    }

    /**
     * 搜索简单环
     * @param curves 
     * @param polygon 
     */
    public static simpleHole(curves: Curve2d[]): Polygon[] {
        let loops = SearchGraph.simpleLoop(curves);
        if (!loops.length) {
            return [];
        }
        loops = loops.filter(l => {
            if (!(l.getType() === GeometryType.enLoop)) {
                console.warn('不是合法的Loop');
                return false;
            } else {
                return true;
            }
        });

        const tree = LoopsToLoopTreeSearchGraph.execute(loops as Loop[]);
        tree.makeValid(true);
        // 组成polygon

        const tloops: Polygon[] = [];
        tree.collectHoles(tloops);
        tloops.forEach(polygon => {
            polygon.reverse();
        });
        return tloops;
    }

    /**
     * 输入一堆线，按包含关系搜索出合法polygon
     * @param curves 
     * @param polygon 
     */
    public static simplePolygon(curves: Curve2d[]): Polygon | undefined {
        const loops = SearchGraph.simpleLoop(curves);
        if (!loops.length) {
            return;
        }
        for (const loop of loops) {
            if (!(loop.getType() === GeometryType.enLoop)) {
                console.error('不是合法的polygon');
                return;
            }
        }

        const tree = LoopsToLoopTreeSearchGraph.execute(loops as Loop[]);
        tree.makeValid(true);
        const tloops: Loop[] = [];
        tree.collectLoops(tloops);
        return new Polygon(tloops);
    }

    /**
     * 根据包含关系，将loop[]，转成带有包含关系的loop
     * @param curve 
     * @param polygon 
     */
    public static loopsToTree(loops: Loop[]): LoopTreeNode {
        return LoopsToLoopTreeSearchGraph.execute(loops);
    }

    /**
     * 根据包含关系，将loop[]，组成polygonEx
     * @param loops 
     * @returns polygon[]
     */
    public static loopsToPolygonExs(loops: Loop[]): Polygon[] {
        return LoopsToPolygonExes.execute(loops);
    }

    /**
     * 根据包含关系，将polygon，组成polygonEx
     * @param loops 
     * @returns polygon[]
     */
    public static polygonToPolygonExs(polygon: Polygon): Polygon[] {
        if (polygon.getLoops().length < 2) {
            return [polygon];
        }
        return SearchGraph.loopsToPolygonExs(polygon.getLoops());
    }

    /**
     * 根据输入的polygon搜索洞
     * @param polygon 
     * @returns polygon[]
     */
    public static polygonToHoles(polygon: Polygon): Polygon[] {
        return SearchGraph.loopsToHoles(polygon.getLoops());
    }

    /**
     * 根据输入的loop搜索洞
     * @param loops 
     * @returns polygon[]
     */
    public static loopsToHoles(loops: Loop[]): Polygon[] {
        const tree = SearchGraph.loopsToTree(loops);
        const result: Polygon[] = [];
        tree.collectHoles(result);
        result.forEach(r => {
            r.reverse();
        });
        return result;
    }

    /**
     * 搜索点的凸包,返回凸包上的点，外部可直接封装成loop
     * @param loops 
     * @returns polygon[]
     */
    public static ptsToConvexHull(points: XY[]): Vector2[] {
        return SearchConvexHull.execute(points);
    }
}

export { SearchGraph };
