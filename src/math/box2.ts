import { Box } from './box';
import { Vector2 } from './vector2';
import { XY } from './xy';
import { ErrorSystem } from './error_system';
import { MathType } from './math_type';

/**
 * 二维AABB包围盒
 */
class Box2 extends Box<Vector2> {

    constructor(points?: XY[]) {
        super();
        const max = ErrorSystem.MODEL_MAX_LENGTH;
        this.min = new Vector2([max, max]);
        this.max = new Vector2([-max, -max]);
        this.reset(points);
    }

    /**
     * 根据传入的点重置包围盒
     * @param points 
     */
    public reset(points?: XY[]): this {
        this.makeEmpty();
        if (points === undefined) {//
            return this;
        }

        for (const p of points) {
            this.expandByPoint(new Vector2(p));
        }
        return this;
    }

    public clone(): Box2 {
        return new Box2([this.min, this.max]);
    }

    public asString() {
        return '';
    }

    public getType() {
        return MathType.enBox2D;
    }
}

export { Box2 };
