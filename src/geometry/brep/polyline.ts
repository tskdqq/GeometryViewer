import { RenderObject } from '../../algorithm/discrete/render_object';
import { CurveCuvePositonType } from '../../algorithm/position_judge/position_judge_type';
import { Box2 } from '../../math/box2';
import { ErrorSystem } from '../../math/error_system';
import { Matrix3 } from '../../math/matrix3';
import { Vector2 } from '../../math/vector2';
import { XY } from '../../math/xy';
import { DebugWarn } from '../../util/debug_warn';
import { UUIDUtil } from '../../util/uuid_util';
import { Arc2d } from '../arc2d';
import { Curve2d } from '../curve2d';
import { GeometryType } from '../../geometry/geometry_type';
import { PolylineInterface } from '../geo_interfaces';
import { Line2d } from '../line2d';
import { Coedge } from './coedge';
import { TopoObject } from './topo_objecet';
import { TopoTrackType } from './topo_track_type';
import { CurveCurvePositionJudge } from '../../algorithm/curve_curve_position_judge';
import { LineLineIntersect } from '../../algorithm/intersect/line_line_intersect';

/**
 * @author tiansk
 *   首尾相接且无自交，可以不封闭的曲线序列
 */
class Polyline extends TopoObject {

    /**
     *  将元数据，反序列化
     */
    public static loadFromAny(data: PolylineInterface): Polyline {
        const geo = new Polyline();
        for (const obj of data.coedges) {
            const edge = Coedge.loadFromAny(obj);
            geo.addCoedge(edge);
        }
        geo.copyInternalDataFrom(data);
        return geo;
    }

    // 当前序列
    protected readonly coedges: Coedge[] = [];

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
                for (let i = 0; i < params.length - 1; i++) {
                    if (!new Vector2(params[i] as XY).equals(params[(i + 1) % params.length] as XY)) {
                        this.addCurve(new Line2d(params[i] as XY, params[i + 1] as XY));
                    }
                }
            } else {
                params.forEach(p => this.addCurve(p as Curve2d));
            }
        }
    }

    /**
     *  向序列中加一条曲线，直接加入，不作合法性检查
     * @param curve 曲线
     * @returns 返回Coedge
     */
    public addCurve(curve: Curve2d): Coedge {
        const coEdge = new Coedge(curve);
        this.addCoedge(coEdge);
        return coEdge;
    }

    /**
     * 使相邻的coedge起点末点交于一点 
     */
    public makeStartEndConnected(connectedHeadTail? : boolean): this {
        for (let i = 0; i < (connectedHeadTail !== undefined && !connectedHeadTail && this.coedges.length - 1 > 0 ? this.coedges.length - 1 : this.coedges.length); i++) {  // connectedHeadTail = false 不连接头和尾部
            const curve = this.coedges[i].curve as Line2d;
            const nextCurve = this.coedges[(i + 1) % this.coedges.length].curve as Line2d;

            if (curve.getEndPt().equals(nextCurve.getStartPt(), 1e-8)) {
                continue;
            }

            // 平行
            if (curve.isParalellTo(nextCurve)) {
                this.addCurve(new Line2d(curve.getEndPt(), nextCurve.getStartPt()));
                const coedge = this.coedges.pop();
                if (coedge) {
                    this.coedges.splice(i + 1, 0, coedge);
                    i += 1;
                    continue;
                }
            }

            const curve1 = curve.clone()
                .extendDouble(ErrorSystem.MODEL_MAX_LENGTH);
            const curve2 = nextCurve.clone()
                .extendDouble(ErrorSystem.MODEL_MAX_LENGTH);

            const infos = LineLineIntersect.line2dAndLine2d(curve1, curve2);

            if (infos.length === 1 && !infos[0].isOverlap && infos[0].point) { // 相交于一点
                const pt = infos[0].point;
                if (curve.getStartPt().equals(pt)) {
                    this.coedges[(i + 1) % this.coedges.length].curve = new Line2d(curve.getStartPt(), nextCurve.getEndPt());
                    this.coedges.splice(i, 1);
                    i--;
                } else if (curve.getEndPt().equals(pt) && nextCurve.getEndPt().equals(pt)) {
                    this.coedges[(i + 1) % this.coedges.length].curve = new Line2d(curve.getStartPt(), curve.getEndPt());
                    this.coedges.splice(i, 1);
                    i--;
                } else if (!curve.getEndPt().equals(pt) && nextCurve.getEndPt().equals(pt)) {
                    const userData1 = curve.userData;
                    this.coedges[i].curve = new Line2d(curve.getStartPt(), nextCurve.getEndPt());
                    this.coedges[i].curve.userData = userData1;

                    this.coedges.splice((i + 1) % this.coedges.length, 1);
                } else {
                    const userData1 = curve.userData;
                    this.coedges[i].curve = new Line2d(curve.getStartPt(), pt);
                    this.coedges[i].curve.userData = userData1;

                    const userData2 = nextCurve.userData;
                    this.coedges[(i + 1) % this.coedges.length].curve = new Line2d(pt, nextCurve.getEndPt());
                    this.coedges[(i + 1) % this.coedges.length].curve.userData = userData2;
                }
            } else {
                DebugWarn.assert(false, 'polyline.makeStartEndConnected() LineLineIntersect failed !');
            }
        }
        return this;
    }

    /**
     *  向序列中加一条曲线，直接加入，不作合法性检查
     * @param curve 曲线
     * @returns 返回Coedge
     */
    public insertCoedge(fromIdx: number, ...curves: Curve2d[]): Coedge[] {
        const ces: Coedge[] = [];
        curves.forEach(cv => {
            const coedge = new Coedge(cv);
            coedge.setParent(this);
            ces.push(coedge);
        });
        this.coedges.splice(fromIdx, 0, ...ces);
        return ces;
    }

    /**
     *  向序列中加一条CoEdge，直接加入不作合法性检查
     * @param curve 曲线
     * @returns 加入成功返回true，否则返回false
     */
    public addCoedge(coedge: Coedge): boolean {
        if (!coedge.tag) {
            coedge.tag = UUIDUtil.generateShort();
        }
        coedge.setParent(this);
        this.coedges.push(coedge);

        return true;
    }

    public deleteByArrayIdx(idx: number) {
        if (idx >= 0 && idx < this.coedges.length) {
            this.coedges.splice(idx, 1);
            return;
        }
        throw new Error('out of range');
    }

    /**
     *  取到所有的coedge
     */
    public getCoedges() {
        return this.coedges;
    }

    /**
     * 根据index获取coedge
     * @param index 
     */
    public getCoedgeByTag(uuid: string) {
        return this.coedges.find(ce => {
            return ce.tag === uuid;
        });
    }

    /**
     * 获取所有的曲线,返回曲线的拷贝
     */
    public copyAllCurves(): Curve2d[] {
        return this.coedges.map(ce => {
            return ce.curve.clone();
        });
    }

    /**
     * 获取所有的曲线,返回曲线的拷贝
     */
    public getAllCurves(): Curve2d[] {
        return this.coedges.map(ce => {
            return ce.curve;
        });
    }

    /**
     *  清空所有的coedge
     */
    public clear() {
        this.coedges.splice(0, this.coedges.length);
    }

    /**
     *  清空所有的coedge
     */
    public isEmpty() {
        return this.coedges.length < 1;
    }

    /**
     *  是否是逆时针的环,计算时会自动封闭
     * @returns 逆时针则返回true，否则返回false
     */
    public isAnticlockwise(): boolean {
        return this.calcArea() > 0;
    }

    /**
     *   逆时针变顺时针，顺时针变逆时针
     */
    public reverse(): this {
        for (const coedge of this.coedges) {
            coedge.curve.reverse();
        }
        this.coedges.reverse();
        return this;
    }

    /**
     *  该coedgelist的面积，计算时会自动封闭
     * @returns 顺时针为面积负，逆时针为正
     */
    public calcArea(): number {
        const length = this.coedges.length;
        if (!length) {
            return 0;
        }

        let sum = 0;
        for (const ce of this.coedges) {

            const startPt = ce.curve.getStartPt();
            const endPt = ce.curve.getEndPt();

            const area = 0.5 * startPt.cross(endPt);
            sum += area;

            // arc
            if (ce.curve.getType() === GeometryType.enArc2D) {
                sum += (ce.curve as Arc2d).getArea();
            }
        }
        return sum;
    }

    /**
     *  合法性检查 1.首尾相接  2.无自交
     * @returns 合法返回true，不合法返回false
     */
    public isValid(): boolean {
        // 
        if (this.coedges.length < 1) { return true; }

        for (let i = 1; i < this.coedges.length; i++) {
            const preCurve = this.coedges[i - 1].curve;
            const thisCurve = this.coedges[i].curve;
            const type = CurveCurvePositionJudge.execute(preCurve, thisCurve);
            if (type !== CurveCuvePositonType.INTERSECT_ON) {
                return false;
            }
            if (!preCurve.getEndPt().equals(thisCurve.getStartPt(), ErrorSystem.LENGTH_EPS)) {
                return false;
            }
        }

        return true;
    }


    /**
     * 合并共线的线
     * @param colinearTorlerance  用来判断共线的距离容差
     */
    public merge(colinearTorlerance: number = ErrorSystem.LENGTH_EPS): this {
        // todo先与坐标轴对齐
        if (this.coedges.length < 2) {
            return this;
        }

        const isLoop = (this.getType() === GeometryType.enLoop);

        for (let i = 0; i < (isLoop ? this.coedges.length : this.coedges.length - 1);) {
            const cv = this.coedges[i].curve;
            const next = this.coedges[(i + 1) % this.coedges.length].curve;

            const bNextOverLength = (isLoop && (i + 1) >= this.coedges.length);

            if (cv.getType() !== next.getType()) {
                i++;
                continue;
            }
            if (cv.getType() === GeometryType.enLine2D) {
                if ((cv as Line2d).isColinearWith(next as Line2d, colinearTorlerance)) {
                    this.coedges[i].curve = new Line2d(cv.getStartPt(), next.getEndPt());
                    this.coedges.splice((i + 1) % this.coedges.length, 1);
                    if (bNextOverLength) { // 合并了next是起始的线段，就遍历过一圈了，直接返回
                        return this;
                    }
                    continue;
                }
            }
            i++;
        }
        return this;
    }

    /**
     * 是否只包含直线
     */
    public isOnlyLines() {
        for (const ce of this.coedges) {
            if (ce.curve.getType() !== GeometryType.enLine2D) {
                return false;
            }
        }
        return true;
    }

    // override from Geometry
    public getType() {
        return GeometryType.enPolyline;
    }

    public translate(offset: Vector2): this {
        for (const coedge of this.coedges) {
            const curve = coedge.curve;
            curve.translate(offset);
        }
        return this;
    }

    public rotate(angle: number, axis: Vector2): this {
        for (const coedge of this.coedges) {
            const curve = coedge.curve;
            curve.rotate(angle, axis);
        }
        return this;
    }

    public isClosed() {
        if (!this.coedges.length) {
            return false;
        }
        return this.coedges[0].curve.getStartPt()
            .equals(this.coedges[this.coedges.length - 1].curve.getEndPt());
    }

    /**
     *  缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center: Vector2 = Vector2.zero()): this {
        this.coedges.forEach(ce => ce.scale(factor, center));
        return this;
    }

    public applyTransform(m: Matrix3): this {
        this.coedges.forEach(ce => {
            ce.applyTransform(m);
        });

        if (m.isMirror()) {
            this.reverse();
        }

        return this;
    }

    public getBoundingBox(): Box2 {
        const box = new Box2();
        for (const coedge of this.coedges) {
            const curve = coedge.curve;
            box.union(curve.getBoundingBox());
        }
        return box;
    }

    /**
     * 提取角点
     */
    public toPath(): Vector2[] {
        DebugWarn.assert(this.isOnlyLines(), '不止包含直线，请使用 DiscreteUtil.discretePolyline接口');
        const ces = this.getCoedges();
        if (ces.length < 1) {
            return [];
        }
        const result = ces.map(ce => {
            return ce.curve.getStartPt();
        });
        result.push(ces[ces.length - 1].curve.getEndPt());
        return result;
    }

    public toMetaData(): PolylineInterface {
        const meta = {
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

    public toRenderObject(showDebugInfo: false): RenderObject {
        const render = new RenderObject(this.refId, 'Polyline_' + this.simpleUUID());
        render.children = [];
        for (const ce of this.coedges) {
            render.children.push(ce.toRenderObject(showDebugInfo));
        }
        return render;
    }

    public clone(): Polyline {
        const polyline = new Polyline();
        for (const ce of this.coedges) {
            polyline.addCoedge(ce.clone());
        }
        return polyline;
    }

    /**
     * clone的时候保持tag和拓扑
     */
    public cloneAndReserveTag(): Polyline {
        const polyline = new Polyline();
        for (const ce of this.coedges) {
            polyline.addCoedge(ce.cloneAndReserveTag());
        }
        polyline.copyInternalDataFrom(this);
        return polyline;
    }

    public getCentroidPoint(): Vector2 {
        const allcurves = this.getAllCurves();
        let area: number = 0;
        let x: number = 0;
        let y: number = 0;
        allcurves.forEach(curve => {
            const centroidPtAndArea = curve.getCentroidPoint();
            x += centroidPtAndArea.pt.x * centroidPtAndArea.area /* * 3 加注释方便理解*/;
            y += centroidPtAndArea.pt.y * centroidPtAndArea.area /* * 3 加注释方便理解*/;
            area += centroidPtAndArea.area;
        });

        return new Vector2(x / area/* * 3 加注释方便理解*/, y / area /* * 3 加注释方便理解*/);
    }
}

export { Polyline };


