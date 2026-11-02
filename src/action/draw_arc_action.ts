import { Vector3 } from '../math/vector3';
import { MainWindow } from '../ui/MainWindow';
import { Arc2d } from '../geometry/arc2d';
import { ActionBase } from './actionbase';
import { CommandString } from './command_string';
import { GeoDocument } from '../ui/geo_document';
import { Command } from './command';
import { PickupManager } from '../ui/pick_up_manager';

/**
 * 画线Action
 */
class DrawArcAction extends ActionBase {

    private points: Vector3[] = [];

    public initAction() {
        this.points = [];
    }

    public onLButtonDown(view: MainWindow, p: Vector3): boolean {
        const pos = PickupManager.getInstance().getPickedPoints(p)[0];
        this.points.push(pos.clone());
        if (this.points.length === 3) {
            const arc2d = Arc2d.createByThreePoints(this.points[0], this.points[1], this.points[2]);
            this.dbDoc.add(arc2d);
            this.points = [];
        }
        return true;
    }

    public onMouseMove(view: any, pos: Vector3): boolean {
        if (this.points.length > 0) {
            this.clearTmp();
            this.drawTmpArc(this.points, pos);
        }
        return true;
    }

    public onRButtonDown(view: any, pos: Vector3): boolean {
        this.makeFinished();
        return true;
    }

    public onFinish() {
        return;
    }

}

class DrawArcCommand extends Command {

    constructor() {
        super(CommandString.DRAW_ARC_ACTION);
    }

    public execute(): ActionBase | undefined {
        return new DrawArcAction(GeoDocument.getInstance());
    }
}

export { DrawArcAction, DrawArcCommand };

