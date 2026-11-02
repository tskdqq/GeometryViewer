import { DiscreteUtil } from '../algorithm/discrete_util';
import { Loop } from '../geometry/brep/loop';
import { Polygon } from '../geometry/brep/polygon';
import { XY } from '../math/xy';
import { GeoDocument } from './geo_document';
import { RenderMgr } from '../threejs/RenderMgr';
import { Vector3 } from '../math/vector3';
import { KeyBoardEventHandler } from '../event_handler/key_board_event_handler';
import { MathUtil } from '../util/math_util';
import { Curve2d } from '../geometry/curve2d';

/**
 *
 */
class PickupManager {
    // 单例
    public static getInstance(): PickupManager {
        if (!PickupManager.instance) {
            PickupManager.instance = new PickupManager();
        }
        return PickupManager.instance;
    }

    private static instance: PickupManager;

    public getPickedPoints(target: Vector3, previous?: Vector3): Vector3[] {
        if (previous && KeyBoardEventHandler.getInstance().shift) {
            const vec = target.clone().sub(previous);
            const angle = vec.toVector2().angleFromX();
            if (angle > MathUtil.PI_4 && angle < MathUtil.PI_4 * 3
                || angle > MathUtil.PI_4 * 5 && angle < MathUtil.PI_4 * 7) {
                return [new Vector3(previous.x, previous.y + vec.y, 0)];
            }

            return [new Vector3(previous.x + vec.x, previous.y, 0)];
        }
        const result: Vector3[] = [];
        const pixel = this.getAPixelLength() * 8;
        const candidates = this.getAllPoints();
        for (const p of candidates) {
            if (target.distanceTo(p) < pixel) {
                result.push(p);
            }
        }

        if (result.length < 1) {
            result.push(target);
        }
        return result;
    }

    public getAllPoints(): Vector3[] {
        const result: XY[] = [];
        for (const geo of GeoDocument.getInstance().getAllData()) {
            if (geo instanceof Polygon) {
                // 
                for (const l of geo.loops) {
                    result.push(...DiscreteUtil.discretePolyline(l, 0.1));
                }
            } else if (geo instanceof Loop) {
                // 
                result.push(...DiscreteUtil.discretePolyline(geo, 0.1));
            } else if (geo instanceof Curve2d) {
                result.push(geo.getStartPt(), geo.getEndPt());
            }
        }

        return result.map(r => {
            return new Vector3(r.x, r.y, 0);
        });
    }

    public getAPixelLength() {
        const p1 = RenderMgr.getInstance().screenPtToWorld2d(0, 0);
        const p2 = RenderMgr.getInstance().screenPtToWorld2d(1, 0);
        return p1.distanceTo(p2);
    }

}

export { PickupManager };

