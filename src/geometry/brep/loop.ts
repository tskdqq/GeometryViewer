import { RenderObject } from '../../algorithm/discrete/render_object';
import { CurveCuvePositonType } from '../../algorithm/position_judge/position_judge_type';
import { ErrorSystem } from '../../math/error_system';
import { Vector2 } from '../../math/vector2';
import { XY } from '../../math/xy';
import { LoopInterface } from '../geo_interfaces';
import { GeometryType } from '../../geometry/geometry_type';
import { Line2d } from '../line2d';
import { Coedge } from './coedge';
import { Polyline } from './polyline';
import { Curve2d } from '../curve2d';
import { DebugWarn } from '../../util/debug_warn';
import { TopoTrackType } from './topo_track_type';
import { CurveCurvePositionJudge } from '../../algorithm/curve_curve_position_judge';
import { Polygon } from './polygon';

/**
 * 环，封闭且无自交的曲线序列
 */
class Loop extends Polyline {

    /**
     *  将元数据，反序列化
     */
    public static loadFromAny(jsObj: LoopInterface): Loop {
        const geo = new Loop();
        geo.copyInternalDataFrom(jsObj);
        for (const obj of jsObj.coedges) {
            const edge = Coedge.loadFromAny(obj);
            geo.addCoedge(edge);
        }
        return geo;
    }

    /**
     *  由2点构造一个矩形Loop,逆时针
     * @param points 
     */
    public static createByOffset(curveOrPolyline: Curve2d | Polyline, leftOffset: number, rightOffset: number): Loop {
        DebugWarn.assert(curveOrPolyline && leftOffset >= 0 && rightOffset >= 0, '偏移值不小于0');
        let curves: Curve2d[];
        if (curveOrPolyline instanceof Polyline) {
            DebugWarn.assert(curveOrPolyline.isValid());
            curves = curveOrPolyline.copyAllCurves();
        } else {
            curves = [curveOrPolyline];
        }
        const rights: Curve2d[] = [];
        const lefts: Curve2d[] = [];
        curves.forEach(cv => {
            const left = cv.clone();
            const right = cv.clone();
            left.offset(-leftOffset);
            right.offset(rightOffset);

            rights.push(right);
            lefts.push(left);
        });
        lefts.reverse().forEach(l => rights.push(l.reverse()));

        return new Loop(rights).makeStartEndConnected();
    }

    /**
     *  由2点构造一个矩形Loop,逆时针
     * @param points 
     */
    public static createByRectangle(cornerPt1: XY, cornerPt2: XY): Loop {
        let minX;
        let minY;
        let maxX;
        let maxY;

        if (cornerPt1.x > cornerPt2.x) {
            minX = cornerPt2.x;
            maxX = cornerPt1.x;
        } else {
            minX = cornerPt1.x;
            maxX = cornerPt2.x;
        }

        if (cornerPt1.y > cornerPt2.y) {
            minY = cornerPt2.y;
            maxY = cornerPt1.y;
        } else {
            minY = cornerPt1.y;
            maxY = cornerPt2.y;
        }

        const pts = [
            new Vector2(minX, minY),
            new Vector2(maxX, minY),
            new Vector2(maxX, maxY),
            new Vector2(minX, maxY)
        ];

        return new Loop(pts);
    }

    /**
     *  由一系列点构造Polyline
     * @param points 
     */
    constructor(points?: XY[]);

    /**
     *  由一系列点构造Polyline
     * @param points 
     */
    constructor(curves?: Curve2d[]);

    /**
     *  由一系列点构造Polyline
     * @param params 
     */
    constructor(params?: (XY | Curve2d)[]) {
        super();

        if (params && params.length > 0) {
            if (!(params[0] instanceof Curve2d)) {
                for (let i = 0; i < params.length; i++) {
                    if (!new Vector2(params[i] as XY).equals(params[(i + 1) % params.length] as XY)) {
                        this.addCurve(new Line2d(params[i] as XY, params[(i + 1) % params.length] as XY));
                    }
                }
            } else {
                params.forEach(p => this.addCurve(p as Curve2d));
            }
        }
    }

    /**
     * @todo 计算有没有自交
     *  环是否合法，封闭且无自交
     */
    public isValid(): boolean {
        const { length } = this.coedges;
        if (this.isOnlyLines() && length < 3) {
            return false;
        }
        // 封闭
        for (let i = 0; i < length; i++) {
            const cur = this.coedges[i].curve;
            const next = this.coedges[(i + 1) % length].curve;
            if (!cur.getEndPt().equals(next.getStartPt(), ErrorSystem.LENGTH_EPS)) {
                console.log('不合法', this.asString());
                return false;
            }
        }

        // 无自交
        for (let i = 0; i < length; i++) {
            const cur1 = this.coedges[i].curve;
            for (let j = i + 1; j < length; j++) {
                const cur2 = this.coedges[j].curve;
                if (CurveCuvePositonType.INTERSECT_IN === CurveCurvePositionJudge.execute(cur1, cur2)) {
                    return false;
                }
            }
        }

        return true;
    }

    // public mergeLines() {
    //     if (this.coedges.length < 2) {
    //         return;
    //     }
    //     const preLines = [];
    //     let i = 0;
    //     for (i = 0; i < this.coedges.length; i++) {
    //         const line1 = this.coedges[i].curve;
    //         const line2 = this.coedges[i === this.coedges.length - 1 ? 0 : i + 1].curve;
    //         if (line1 instanceof Line2d && line2 instanceof Line2d) {
    //             if (line1.isColinearWith(line2)) {
    //                 preLines.push(line1);
    //                 continue;
    //             }
    //         }
    //         break;
    //     }
    //     // 所有的线都是平行的，则向第一条上上投影
    //     if (preLines.length === this.coedges.length) {
    //         return;
    //     }

    //     this.coedges.slice();
    // }

    public isClosed() {
        return true;
    }

    /**
     * 偏移，若偏移失败则返回false
     * @param distance 
     */
    public offset(distance: number): boolean {
        if (this.isEmpty()) {
            return true;
        }
        const polygon = new Polygon(this.clone());
        polygon.offset(distance);

        if (polygon.getLoops().length !== 1) {
            return false;
        }

        this.coedges.splice(0, this.coedges.length);
        this.coedges.push(...polygon.getLoops()[0].getCoedges());

        return true;
    }

    /**
     * 提取角点
     */
    public toPath(): Vector2[] {
        return this.getCoedges().map(ce => {
            return ce.curve.getStartPt();
        });
    }

    // override Geometry
    public getType() {
        return GeometryType.enLoop;
    }

    public toMetaData(): LoopInterface {
        const meta: LoopInterface = {
            type: this.getType(),
            tag: this.tag,
            coedges: this.coedges.map((e) => e.toMetaData()),
            topoTrack: this.topoTrack
        };

        if (this.topoTrack !== undefined && this.topoTrack.operate === TopoTrackType.NEW) {
            delete meta.topoTrack;
        }

        return meta;
    }

    public toRenderObject(showDebugInfo: boolean): RenderObject {
        const render = new RenderObject(this.refId, `Loop_${this.simpleUUID()}`);
        render.children = [];
        for (const ce of this.coedges) {
            render.children.push(ce.toRenderObject(showDebugInfo));
        }
        return render;
    }

    public clone(): Loop {
        const loop = new Loop();
        for (const ce of this.coedges) {
            if (!loop.addCoedge(ce.clone())) {
                throw new Error('add coedge fail');
            }
        }
        return loop;
    }

    /**
     * clone的时候保持tag和拓扑
     */
    public cloneAndReserveTag(): Loop {
        const polyline = new Loop();
        for (const ce of this.coedges) {
            polyline.addCoedge(ce.cloneAndReserveTag());
        }
        polyline.copyInternalDataFrom(this);
        return polyline;
    }
}

export { Loop };
