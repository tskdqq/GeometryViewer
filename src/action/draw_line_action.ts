import { Line2d } from '../geometry/line2d';
import { Vector3 } from '../math/vector3';
import { MainWindow } from '../ui/MainWindow';
import { ActionBase } from './actionbase';
import { Command } from './command';
import { CommandString } from './command_string';
import { PickupManager } from '../ui/pick_up_manager';
import { GeoDocument } from '../ui/geo_document';

/**
 * 画线Action
 */
class DrawLineAction extends ActionBase {

    private oldPt: Vector3 | undefined;

    public initAction() {
        this.oldPt = undefined;
    }

    public onLButtonDown(view: MainWindow, pos: Vector3): boolean {
        const p = PickupManager.getInstance().getPickedPoints(pos, this.oldPt)[0];
        if (this.oldPt) {
            const line = new Line2d(this.oldPt, p);
            this.dbDoc.add(line);
        }
        this.oldPt = p.clone();
        return true;
    }

    public onMouseMove(view: any, pos: Vector3): boolean {
        const p = PickupManager.getInstance().getPickedPoints(pos, this.oldPt)[0];
        if (this.oldPt) {
            this.clearTmp();
            this.drawTmpLine(this.oldPt, p);
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


class DrawLineCommand extends Command {

    constructor() {
        super(CommandString.DRAW_LINE_ACTION);
    }

    public execute(): ActionBase | undefined {
        return new DrawLineAction(GeoDocument.getInstance());
    }
}


export { DrawLineCommand, DrawLineAction };
