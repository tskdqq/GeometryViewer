import { Box } from './box';
import { Vector3 } from './vector3';
import { XYZ } from './xy';
import { ErrorSystem } from './error_system';
import { Line3d } from '../geometry/line3d';
import { MathType } from './math_type';

/**
 * 三维AABB包围盒
 */
class Box3 extends Box<Vector3> {
    constructor(points?: XYZ[]) {
        super();
        const max = ErrorSystem.MODEL_MAX_LENGTH;
        this.min = new Vector3([max, max, max]);
        this.max = new Vector3([-max, -max, -max]);
        this.reset(points);
    }

    /**
     * 根据传入的点重置包围盒
     * @param points 
     */
    public reset(points?: XYZ[]): this {
        this.makeEmpty();
        if (points === undefined) {
            return this;
        }

        for (const p of points) {
            this.expandByPoint(new Vector3(p));
        }
        return this;
    }

    public clone(): Box3 {
        return new Box3([this.min, this.max]);
    }

    public asString() {
        return new Line3d(this.min, this.max).asString();
    }

    public getType() {
        return MathType.enBox3D;
    }
}

export { Box3 };

