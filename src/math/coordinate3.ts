import { Vector3 } from './vector3';
import { XYZ } from './xy';
import { Matrix4 } from './matrix4';
import { Vector2 } from './vector2';
import { Coordinate3Interface } from '../geometry/math_interfaces';
import { MathType } from './math_type';

/**
 * 坐标系
 */
class Coordinate3 {
    public origin: Vector3;
    public xDir: Vector3;
    public yDir: Vector3;

    public static XOY(z = 0) {
        return new Coordinate3(new Vector3(0, 0, z), Vector3.unitX(), Vector3.unitY());
    }
    public static XOZ(y = 0) {
        return new Coordinate3(new Vector3(0, y, 0), Vector3.unitZ(), Vector3.unitX());
    }

    // 计算出来的数据
    private _privateZDir: Vector3;

    constructor(origin: XYZ, xDir: XYZ, yDir: XYZ) {
        this.origin = new Vector3(origin);
        this.xDir = new Vector3(xDir);
        this.yDir = new Vector3(yDir);
        this.xDir.normlize();
        this.yDir.normlize();

        this._privateZDir = this.xDir.cross(this.yDir);
    }

    public get zDir(): Vector3 {
        return this._privateZDir.clone();
    }

    public translate(delta: XYZ) {
        this.origin.add(new Vector3(delta));
        return this;
    }

    /**
     * 将局部坐标系下的（x,y,z）转换到世界坐标
     */
    public toMatrix4() {
        return new Matrix4().copy([
            [this.xDir.x, this.xDir.y, this.xDir.z, 0],
            [this.yDir.x, this.yDir.y, this.yDir.z, 0],
            [this.zDir.x, this.zDir.y, this.zDir.z, 0],
            [this.origin.x, this.origin.y, this.origin.z, 1]
        ]);
    }

    /**
     * 从局部坐标系1到局部坐标系2的变换矩阵
     * @param coor1 
     * @param coor2 
     */
    public static getTransformFrom1To2(coor1: Coordinate3, coor2: Coordinate3): Matrix4 | undefined {
        // 1.先变换到局部坐标系
        const m1 = coor1.toMatrix4().makeInverse();
        if (!m1) {
            return;
        }
        // 2.再变换到coor2
        const m2 = coor2.toMatrix4();
        return m1.multi(m2);
    }

    /**
     * 根据局部坐标系的点获取世界坐标系的点
     * @param uvw 
     */
    public getWorldPtAt(uvw: XYZ | Vector2): Vector3 {
        let xyz;
        if (uvw instanceof Vector2) {
            xyz = { x: uvw.x, y: uvw.y, z: 0 };
        } else {
            xyz = uvw;
        }
        return this.origin.clone()
            .add(this.getWorldVectorAt(xyz));
    }

    public applyTransform(m: Matrix4): this {
        // TODO:暂不考虑缩放,默认没有缩放（如考虑缩放续先判断是否是等比例缩放）
        this.origin.applyTransform(m);
        this.xDir.vecApplyTransform(m);
        this.xDir.normalize();
        this.yDir.vecApplyTransform(m);
        this.yDir.normalize();
        this.zDir.vecApplyTransform(m);
        this.zDir.normalize();

        return this;
    }

    /**
     * 根据世界坐标系的点获取局部坐标系的点
     * @param worldPt 
     */
    public getLocalPtAt(worldPt: XYZ): Vector3 {
        const OA = new Vector3(worldPt).sub(this.origin);

        const x = OA.dot(this.xDir);
        const y = OA.dot(this.yDir);
        const z = OA.dot(this.zDir);

        return new Vector3(x, y, z);
    }

    /**
     * 根据局部坐标系的向量获取世界坐标系的向量
     * @param localVec 
     */
    public getWorldVectorAt(localVec: XYZ | Vector2): Vector3 {
        const { x, y } = localVec;
        let z;
        if (localVec instanceof Vector2) {
            z = 0;
        } else {
            z = localVec.z;
        }
        const du = this.xDir.clone();
        const dv = this.yDir.clone();
        const dw = this.zDir.clone();

        return du.multi(x)
            .add(dv.multi(y))
            .add(dw.multi(z));
    }

    /**
     * 根据世界坐标系的向量获取局部坐标系的向量
     * @param worldVec 
     */
    public getLocalVectorAt(worldVec: XYZ): Vector3 {
        const OA = new Vector3(worldVec);

        const x = OA.dot(this.xDir);
        const y = OA.dot(this.yDir);
        const z = OA.dot(this.zDir);

        return new Vector3(x, y, z);
    }


    public clone(): Coordinate3 {
        return new Coordinate3(this.origin, this.xDir, this.yDir);
    }

    public toMetaData(): Coordinate3Interface {
        return {
            origin: this.origin.toXYZ(),
            xDir: this.xDir.toXYZ(),
            yDir: this.yDir.toXYZ()
        };
    }

    public getType() {
        return MathType.enCoordinate3d;
    }
}

export { Coordinate3 };
