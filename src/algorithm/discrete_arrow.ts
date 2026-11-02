import { Vector2 } from '../math/vector2';
import { MathUtil } from '../util/math_util';
import { Vector3 } from '../math/vector3';
import { MathType } from '../math/math_type';
import { DebugWarn } from '../util/debug_warn';

// 离散箭头
// len 如果小于0.001（1mm）算法中则取0.001
export function discreteArrow(origin: Vector2 | Vector3, direction: Vector2 | Vector3, len: number): Vector2[] | Vector3[] {
    const p = origin.clone();

    const dir = direction.clone();
    dir.normlize();
    dir.reverse();

    let arrLen = len;
    if (arrLen < 0.001) {
        arrLen = 0.001;
    }

    let dir1: Vector2 | Vector3;
    let dir2: Vector2 | Vector3;
    if (origin.getType() === MathType.enVector2D && direction.getType() === MathType.enVector2D) {
        dir1 = (dir as Vector2).clone().rotate(-MathUtil.PI_4);
        dir2 = (dir as Vector2).clone().rotate(MathUtil.PI_4);
        return [dir1.multi(arrLen).add((p as Vector2)), (p as Vector2), dir2.multi(arrLen).add((p as Vector2))];
    } else if (origin.getType() === MathType.enVector3D && direction.getType() === MathType.enVector3D) {
        if ((dir as Vector3).isParalellTo(Vector3.unitZ())) {
            dir1 = Vector3.fromXY({ x: -1, y: 0 }, (dir as Vector3).z);
            dir1.normalize();
            dir2 = Vector3.fromXY({ x: 1, y: 0 }, (dir as Vector3).z);
            dir2.normalize();
        } else {
            dir1 = Vector3.fromXY((dir as Vector3).clone().toVector2().rotate(-MathUtil.PI_4).toXY(), (dir as Vector3).z);
            dir2 = Vector3.fromXY((dir as Vector3).clone().toVector2().rotate(MathUtil.PI_4).toXY(), (dir as Vector3).z);
        }
        return [dir1.multi(arrLen).add((p as Vector3)), ((p as Vector3) as Vector3), dir2.multi(arrLen).add((p as Vector3))];
    } else {
        DebugWarn.assert(false, 'discreteArrow() 中传入类型错误！');
        return [];
    }
}
