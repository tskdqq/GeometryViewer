import { MathUtil } from '../util/math_util';
import { Vector2 } from './vector2';
import { XY } from './xy';
import { MathType } from './math_type';

/**
 * 二维坐标系
 */
class Coordinate2 {

    public origin: Vector2;
    public xDir: Vector2;

    // 计算出来的数据
    private privateYDir: Vector2;

    constructor(origin: XY, xDir: XY) {
        this.origin = new Vector2(origin);
        this.xDir = new Vector2(xDir);

        this.privateYDir = this.xDir.rotate(MathUtil.PI_2);
    }

    public get yDir(): Vector2 {
        return this.privateYDir.clone();
    }

    public translate(delta: XY) {
        this.origin.add(new Vector2(delta));
        return this;
    }

    public clone(): Coordinate2 {
        return new Coordinate2(this.origin, this.xDir);
    }

    public getType() {
        return MathType.enCoordinate2d;
    }
}

export { Coordinate2 };

