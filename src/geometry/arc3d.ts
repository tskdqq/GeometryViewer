import { Vector2 } from '../math/vector2';
import { RenderObject } from '../algorithm/discrete/render_object';
import { Box3 } from '../math/box3';
import { Coordinate3 } from '../math/coordinate3';
import { Matrix4 } from '../math/matrix4';
import { Vector3 } from '../math/vector3';
import { XYZ } from '../math/xy';
import { MathUtil } from '../util/math_util';
import { Arc2d } from './arc2d';
import { Curve3d } from './curve3d';
import { GeometryType } from '../geometry/geometry_type';
import { Arc3dInterface } from './geo_interfaces';
import { Plane } from './plane';

/**
 * 三维弧线
 */
class Arc3d extends Curve3d {

    public static loadFromAny(arc3d: Arc3dInterface) {
        const arc2d = Arc2d.loadFromAny(arc3d.arc2d);
        const coord = new Coordinate3(arc3d.coord.origin, arc3d.coord.xDir, arc3d.coord.yDir);
        return new Arc3d(coord, arc2d);
    }

    // 弧线的圆心
    public coordinate: Coordinate3;
    public arc2d: Arc2d;

    /**
     * @param coordinate 局部坐标系
     * @param arc2d 圆弧
     */
    constructor(coordinate: Coordinate3, arc2d: Arc2d) {
        super();
        this.coordinate = coordinate.clone();
        this.arc2d = arc2d.clone();
        this.range = this.arc2d.getRange();
    }

    public static createArc3dBy3Pts(start: XYZ, end: XYZ, ptOnArc: XYZ): Arc3d | undefined {
        const u = new Vector3(ptOnArc).sub(start);
        const v = new Vector3(end).sub(ptOnArc);

        const plane = new Plane(ptOnArc, u, v);
        const coord = plane.toCoordinate();

        const s = plane.getUVAt(start);
        const e = plane.getUVAt(end);
        const r = plane.getUVAt(ptOnArc);

        const arc2d = Arc2d.createByThreePoints(s, r, e);
        return new Arc3d(coord, arc2d);
    }

    public get radius(): number {
        return this.arc2d.radius;
    }

    public getRange() {
        return this.arc2d.getRange().clone();
    }

    /**
     * 几何对象的类型
     */
    public getType() {
        return GeometryType.enArc3D;
    }

    /**
     * 获取圆弧所在平面的法向量
     */
    public getNormal() {
        return this.coordinate.zDir;
    }

    /**
     * 获取中心点
     */
    public getCenter(): Vector3 {
        return this.coordinate.getWorldPtAt(this.arc2d.getCenter());
    }

    public getClockSign() {
        return this.arc2d.getClockSign();
    }

    public clone() {
        return new Arc3d(this.coordinate.clone(), this.arc2d.clone());
    }

    public applyTransform(m: Matrix4): this {
        // TODO:暂不考虑缩放（如考虑缩放续先判断必须是等比例缩放，同时将缩放比例作用于半径）
        this.coordinate.applyTransform(m);

        return this;
    }

    /**
     * 计算包围盒
     */
    public getBoundingBox(): Box3 {
        const center = this.getCenter();
        const radius = this.radius;
        const stPt = this.getStartPt();
        const endPt = this.getEndPt();
        const unitNormal = new Vector3(this.getNormal().toXYZ());
        unitNormal.normalize();

        // 特殊情况，平面法向与坐标轴平行
        if (unitNormal.isSameDirectionWith(Vector3.unitX())) {
            return new Box3([{ x: center.x, y: center.y - radius, z: center.z - radius }, { x: center.x, y: center.y + radius, z: center.z + radius }]);
        }
        if (unitNormal.isSameDirectionWith(Vector3.unitY())) {
            return new Box3([{ x: center.x - radius, y: center.y, z: center.z - radius }, { x: center.x + radius, y: center.y, z: center.z + radius }]);
        }
        if (unitNormal.isSameDirectionWith(Vector3.unitZ())) {
            return new Box3([{ x: center.x - radius, y: center.y - radius, z: center.z }, { x: center.x + radius, y: center.y + radius, z: center.z }]);
        }

        // x方向极小值与极大值
        let xMin = Math.min(stPt.x, endPt.x);
        let xMax = Math.max(stPt.x, endPt.x);
        const worldXLocalVec = this.coordinate.getLocalVectorAt(Vector3.unitX());
        const xLocalMinExtremPt = this.arc2d.getCenter().add(new Vector2(worldXLocalVec.x, worldXLocalVec.y).normalize().multi(-radius));
        const xLocalMaxExtremPt = this.arc2d.getCenter().add(new Vector2(worldXLocalVec.x, worldXLocalVec.y).normalize().multi(radius));
        if (this.arc2d.containsPoint(xLocalMinExtremPt)) {
            xMin = this.coordinate.getWorldPtAt(xLocalMinExtremPt).x;
        }
        if (this.arc2d.containsPoint(xLocalMaxExtremPt)) {
            xMax = this.coordinate.getWorldPtAt(xLocalMaxExtremPt).x;
        }

        // y方向极小值与极大值
        let yMin = Math.min(stPt.y, endPt.y);
        let yMax = Math.max(stPt.y, endPt.y);
        const worldYLocalVec = this.coordinate.getLocalVectorAt(Vector3.unitY());
        const yLocalMinExtremPt = this.arc2d.getCenter().add(new Vector2(worldYLocalVec.x, worldYLocalVec.y).normalize().multi(-radius));
        const yLocalMaxExtremPt = this.arc2d.getCenter().add(new Vector2(worldYLocalVec.x, worldYLocalVec.y).normalize().multi(radius));
        if (this.arc2d.containsPoint(yLocalMinExtremPt)) {
            yMin = this.coordinate.getWorldPtAt(yLocalMinExtremPt).y;
        }
        if (this.arc2d.containsPoint(xLocalMaxExtremPt)) {
            yMax = this.coordinate.getWorldPtAt(yLocalMaxExtremPt).y;
        }

        // z方向极小值与极大值
        let zMin = Math.min(stPt.z, endPt.z);
        let zMax = Math.max(stPt.z, endPt.z);
        const worldZLocalVec = this.coordinate.getLocalVectorAt(Vector3.unitZ());
        const zLocalMinExtremPt = this.arc2d.getCenter().add(new Vector2(worldZLocalVec.x, worldZLocalVec.y).normalize().multi(-radius));
        const zLocalMaxExtremPt = this.arc2d.getCenter().add(new Vector2(worldZLocalVec.x, worldZLocalVec.y).normalize().multi(radius));
        if (this.arc2d.containsPoint(zLocalMinExtremPt)) {
            zMin = this.coordinate.getWorldPtAt(zLocalMinExtremPt).z;
        }
        if (this.arc2d.containsPoint(zLocalMaxExtremPt)) {
            zMax = this.coordinate.getWorldPtAt(zLocalMaxExtremPt).z;
        }

        return new Box3([{ x: xMin, y: yMin, z: zMin }, { x: xMax, y: yMax, z: zMax }]);
    }

    /**
     * 获取弧上某个度数对应的点
     */
    public getPtAtAngle(t: number): Vector3 {
        return this.coordinate.getWorldPtAt(this.arc2d.getPtAtAngle(t));
    }

    /**
     * 获取某段弧长对应的位置 
     */
    public getPtAt(t: number): Vector3 {
        return this.coordinate.getWorldPtAt(this.arc2d.getPtAt(t));
    }

    // /**
    //  * 获取该弧所在圆上任意一点对应的角度
    //  */
    // public getAngleAtPosition(point: XYZ): number {
    //     const pointVector = new Vector3(point).sub(this.center).div(this.radius);
    //     const signValue = Math.sign(this.dirU.x * this.dirV.y - this.dirU.y * this.dirV.x);
    //     const y = (pointVector.y * this.dirU.x - pointVector.x * this.dirU.y) * signValue;
    //     const x = (pointVector.x * this.dirV.y - pointVector.y * this.dirV.x) * signValue;
    //     const angle = Math.atan2(y, x);
    //     if (angle < 0) {
    //         return angle + MathUtil.PI2;
    //     }
    //     return angle;
    // }

    /**
     *  获取该点对应的弧长
     */
    public getParamAt(point: XYZ): number {
        const wp = this.coordinate.getWorldPtAt(point);
        return this.arc2d.getParamAt(wp);
    }

    /**
     * 获取某弧度的切线
     */
    public getTangentAt(t: number): Vector3 {
        return this.coordinate.getWorldVectorAt(this.arc2d.getTangentAt(t));
    }

    /**
     * 反向
     */
    public reverse(): this {
        this.arc2d.reverse();
        return this;
    }

    /**
     * 平移
     */
    public translate(offset: Vector3): this {
        this.coordinate.translate(offset);
        return this;
    }

    /**
     * 抽取元数据，用于序列化
     */
    public toMetaData(): Arc3dInterface {
        return {
            type: GeometryType.enArc3D,
            arc2d: this.arc2d.toMetaData(),
            coord: this.coordinate.toMetaData()
        };
    }

    /**
     * 获取弧长
     */
    public getLength(): number {
        return this.arc2d.getLength();
    }

    public toRenderObject(showDebugInfo: boolean): RenderObject {
        const render = new RenderObject(this.refId, 'Arc3d');
        const arr = this.discrete();
        const edgesArr = [];

        for (let i = 0; i < arr.length - 1; ++i) {
            edgesArr.push([i, i + 1]);
        }

        render.edges = edgesArr;
        render.vertices = arr;
        return render;
    }

    public discrete(stepLenth = 0.1): Vector3[] {
        return this.arc2d.discrete(stepLenth).map(p => {
            return this.coordinate.getWorldPtAt(p);
        });
    }

    /**
     * 是否包含某个点, 即某点是否在该弧上
     */
    public containsPoint(point: Vector3 | XYZ): boolean {
        const localPt = this.coordinate.getLocalPtAt(point);
        if (!MathUtil.isNearlyZero(localPt.z)) {
            return false;
        } else {
            return this.arc2d.containsPoint(localPt);
        }
    }

}

export { Arc3d };


