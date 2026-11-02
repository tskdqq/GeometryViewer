import { RenderObject } from '../../algorithm/discrete/render_object';
import { PositionJudge } from '../../algorithm/position_judge';
import { LoopLoopPositonType } from '../../algorithm/position_judge/position_judge_type';
import { SearchGraph } from '../../algorithm/search_graph';
import { Box2 } from '../../math/box2';
import { Matrix3 } from '../../math/matrix3';
import { Vector2 } from '../../math/vector2';
import { XY } from '../../math/xy';
import { PolygonInterface } from '../geo_interfaces';
import { GeometryType } from '../../geometry/geometry_type';
import { Loop } from './loop';
import { TopoObject } from './topo_objecet';
import { UUIDUtil } from '../../util/uuid_util';
import { Coedge } from './coedge';
import { Curve2d } from '../curve2d';
import { TopoTrackType } from './topo_track_type';
import { PolygonOffset } from '../../algorithm/offset/polygon_offset';

/**
 * Polygon，可以有多个外环，和多个内环（孔洞）
 */
class Polygon extends TopoObject {

    public static loadFromAny(jsObject: PolygonInterface): Polygon {
        const newPolygon = new Polygon();

        for (const l of jsObject.loops) {
            const loop = Loop.loadFromAny(l);
            newPolygon.addLoop(loop);
        }
        newPolygon.copyInternalDataFrom(jsObject);
        return newPolygon;
    }

    /**
     *  由2点构造一个矩形Loop,逆时针,然后再构造Polygon
     * @param points 
     */
    public static createByRectangle(cornerPt1: XY, cornerPt2: XY): Polygon {
        return new Polygon(Loop.createByRectangle(cornerPt1, cornerPt2));
    }

    /**
     *  由一个环向里和向外偏移得到两个环，拼成一个Polygon
     * @param loop         时针方向任意
     * @param innerOffset  环向内偏移值（>0）
     * @param outterOffset 环向外偏移值（>0）
     */
    public static createByOffsetLoop(loop: Loop, innerOffset: number, outterOffset: number): Polygon {
        if (!loop.isValid() || !loop.isClosed() || loop.getAllCurves().length < 3) {
            return new Polygon();
        }

        if (!loop.isAnticlockwise()) {
            loop.reverse();
        }
        const outterLoop = loop.clone();
        for (const outCv of outterLoop.getAllCurves()) {
            outCv.offset(outterOffset);
        }
        outterLoop.makeStartEndConnected();
        const innerLoop = loop.clone();
        for (const innerCv of innerLoop.getAllCurves()) {
            innerCv.offset(-innerOffset);
        }
        innerLoop.makeStartEndConnected();
        innerLoop.reverse();
        if (outterLoop.isClosed() && innerLoop.isClosed() && outterLoop.isAnticlockwise() && !innerLoop.isAnticlockwise()) {
            return new Polygon([outterLoop, innerLoop]);
        } else {
            return new Polygon();
        }
    }

    // 所有的环
    public readonly loops: Loop[] = [];

    /**
     * 默认构造方法
     */
    constructor();

    /**
     * 多个用点表示的多个环
     */
    constructor(ptsArray: XY[][]);

    /**
     * 多个用点表示的单个环
     */
    constructor(pts: XY[]);

    /**
     * 单个环
     */
    constructor(loop: Loop);

    /**
     * 多个环
     */
    constructor(loops: Loop[]);

    constructor(a?: any) {
        super();

        if (!a) { return; }

        if (a instanceof Loop) {
            this.addLoop(a);
        }

        if (a instanceof Array && a.length > 0) {
            if (a[0] instanceof Array) {
                const loops = a.map(pts => new Loop(pts));
                this._sortLoopByArea(loops);
                loops.forEach(l => this._addLoop(l, false));
                return;
            }

            if (a[0] instanceof Loop) {
                const loops = [...a];
                this._sortLoopByArea(loops);
                loops.forEach(l => this._addLoop(l, false));
                return;
            }

            if (typeof (a[0]) === 'object'
                && a[0].x !== undefined && typeof (a[0].x) === 'number'
                && a[0].y !== undefined && typeof (a[0].y) === 'number') {

                this.addLoop(new Loop(a));
                return;
            }
        }
    }

    public getLoops() {
        return this.loops;
    }

    public isEmpty() {
        return this.loops.length < 1;
    }

    public reverse() {
        this.loops.forEach(l => {
            l.reverse();
        });
        this.loops.reverse();

        return this;
    }

    public merge() {
        this.loops.forEach(l => l.merge());

        // 共线合并后有环退化（只有一条边），删除退化的环
        for (let index = 0; index < this.loops.length; index++) {
            if (this.loops[index].getAllCurves().length < 2) {
                this.loops.splice(index, 1);
            }
        }
    }

    /**
     * 是否只包含直线
     */
    public isOnlyLines() {
        for (const ce of this.loops) {
            if (!ce.isOnlyLines()) {
                return false;
            }
        }
        return true;
    }

    /**
     * polygon是否合法
     * - 空polygon也合法
     * - 所有的内环都在外环内
     * - 环之间没有交
     * - 内环不能直接包含内环，外环不能直接包含外环，要交替包含
     * @todo 内外环交替包含
     */
    public isValid() {
        if (this.loops.length < 1) {
            return true;
        }
        if (!this.isOnlyLines()) {
            console.error('带有圆弧的polygon暂时全返回true');
            return true;
        }
        // 每一个环都是合法环
        for (const loop of this.loops) {
            if (!loop.isValid()) {
                return false;
            }
        }

        if (this.loops.length === 1) {
            if (this.loops[0].isAnticlockwise()) {
                return true;
            } else {
                return false;
            }
        }

        // 环与环不能相交
        for (let i = 0; i < this.loops.length; i++) {
            let loop1 = this.loops[i];
            let loop2 = (i === this.loops.length - 1) ? this.loops[0] : this.loops[(i + 1)];
            if (!loop1.isAnticlockwise()) {
                loop1 = loop1.clone().reverse();
            }
            if (!loop2.isAnticlockwise()) {
                loop2 = loop2.clone().reverse();
            }
            const type = PositionJudge.loopToLoop(loop1, loop2);

            if (LoopLoopPositonType.INTERSECT === type) {
                return false;
            }
        }

        // 确保内外环交替包含
        const tree = SearchGraph.loopsToTree([...this.loops]);

        return tree.isPolygonValid();
    }

    // public mergeLines() {
    //     this.loops.forEach(l => {
    //         l.mergeLines();
    //     });
    // }

    /**
     * 向polygon中加入环,可以是外环，可以是内环
     * @param loop 
     * @returns 加入成功返回true，否则返回false
     */
    public addLoop(loop: Loop): boolean {
        return this._addLoop(loop);
    }

    /**
     * 
     */
    private _addLoop(loop: Loop, sort: boolean = true): boolean {
        if (!loop.tag) {
            loop.tag = UUIDUtil.generateShort();
        }
        this.loops.push(loop);
        loop.setParent(this);
        if (sort) {
            this._sortLoopByArea(this.loops);
        }
        return true;
    }

    private _sortLoopByArea(loops: Loop[]) {
        const areaPriorityQueue = loops.map(l => { return { area: l.calcArea(), loop: l }; }).sort((a, b) => { return b.area - a.area; });
        for (let i = 0; i < areaPriorityQueue.length; i++) {
            loops[i] = areaPriorityQueue[i].loop;
        }
    }


    public makeStartEndConnected() {
        this.getLoops().forEach(l => l.makeStartEndConnected());
    }

    /**
     * 删除所有环
     * @returns 加入成功返回true，否则返回false
     */
    public deleteAllLoops(): boolean {
        this.loops.splice(0, this.loops.length);
        return true;
    }


    /**
     * 根据tag获取Loop
     * @param index 
     */
    public getLoopByTag(uuid: string): Loop | undefined {
        for (const l of this.getLoops()) {
            if (l.tag === uuid) {
                return l;
            }
        }
        return;
    }

    /**
     * 根据tag获取Loop
     * @param index 
     */
    public getCoedgeByTag(uuid: string): Coedge | undefined {
        for (const l of this.getLoops()) {
            for (const ce of l.getCoedges()) {
                if (ce.tag === uuid) {
                    return ce;
                }
            }
        }

        return;
    }

    public getCoedges(): Coedge[] {
        const result: Coedge[] = [];
        this.loops.forEach(l => {
            result.push(...l.getCoedges());
        });

        return result;
    }

    /**
     * 获取所有的曲线
     */
    public copyAllCurves(): Curve2d[] {
        const curves: Curve2d[] = [];
        this.loops.forEach(loop => {
            curves.push(...loop.copyAllCurves());
        });
        return curves;
    }

    /**
     * 获取所有的曲线
     */
    public getAllCurves(): Curve2d[] {
        const curves: Curve2d[] = [];
        this.loops.forEach(loop => {
            curves.push(...loop.getAllCurves());
        });
        return curves;
    }


    /**
     * 计算Polygon的面积
     */
    public calcArea(): number {
        let sum = 0;
        for (const loop of this.loops) {
            sum += loop.calcArea();
        }
        return sum;
    }

    // override Geometry
    public getType() {
        return GeometryType.enPolygon;
    }

    public translate(offset: Vector2): this {
        for (const loop of this.loops) {
            loop.translate(offset);
        }
        return this;
    }

    public rotate(angle: number, pivot: Vector2): this {
        for (const loop of this.loops) {
            loop.rotate(angle, pivot);
        }
        return this;
    }

    /**
     *  缩放
     * @param factor 放大因子
     * @param center 缩放中心
     */
    public scale(factor: number, center: Vector2 = Vector2.zero()): this {
        this.loops.forEach(loop => loop.scale(factor, center));
        return this;
    }

    public applyTransform(m: Matrix3): this {
        for (const loop of this.loops) {
            loop.applyTransform(m);
        }
        return this;
    }

    /**
     * 偏移，若偏移失败则返回false
     * @param distance 
     */
    public offset(distance: number): boolean {
        if (this.isEmpty()) {
            return false;
        }
        const polyogn = PolygonOffset.polygonOffset(this, distance);
        this.loops.splice(0, this.loops.length);
        polyogn.getLoops().forEach(l => this.addLoop(l));
        return true;
    }

    public getBoundingBox(): Box2 {
        const box = new Box2();
        for (const loop of this.loops) {
            const b = loop.getBoundingBox();
            box.union(b);
        }
        return box;
    }

    /**
     * 提取角点
     */
    public toPaths(): Vector2[][] {
        return this.getLoops().map(l => {
            return l.toPath();
        });
    }

    public toMetaData(): PolygonInterface {
        const meta = {
            type: this.getType(),
            tag: this.tag,
            loops: this.loops.map((loop) => loop.toMetaData()),
            topoTrack: this.topoTrack
        };

        if (this.topoTrack !== undefined && this.topoTrack.operate === TopoTrackType.NEW) {
            delete meta.topoTrack;
        }

        return meta;
    }

    public toRenderObject(showDebugInfo: boolean): RenderObject {
        const render = new RenderObject(this.refId, 'Polygon_' + this.simpleUUID());
        render.children = [];
        for (const loop of this.loops) {
            render.children.push(loop.toRenderObject(showDebugInfo));
        }

        return render;
    }

    public clone(): Polygon {
        const polygon = new Polygon();
        this.loops.forEach(l => {
            polygon._addLoop(l.clone(), false);
        });
        return polygon;
    }

    /**
     * clone的时候保持tag和拓扑
     */
    public cloneAndReserveTag(): Polygon {
        const polygon = new Polygon();
        this.loops.forEach(l => {
            polygon._addLoop(l.cloneAndReserveTag(), false);
        });
        polygon.copyInternalDataFrom(this);
        return polygon;
    }

    public getCentroidPoint(): Vector2 {
        const allcurves = this.getAllCurves();
        let area: number = 0;
        let x: number = 0;
        let y: number = 0;
        allcurves.forEach(curve => {
            const centroidPtAndArea = curve.getCentroidPoint();
            x += centroidPtAndArea.pt.x * centroidPtAndArea.area/* * 3 加注释方便理解*/;
            y += centroidPtAndArea.pt.y * centroidPtAndArea.area/* * 3 加注释方便理解*/;
            area += centroidPtAndArea.area;
        });

        return new Vector2(x / area /* * 3 加注释方便理解*/, y / area /* * 3 加注释方便理解*/);
    }
}

export { Polygon };
