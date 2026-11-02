import { Vector3 } from '../math/vector3';
import { MainWindow } from '../ui/MainWindow';
import { ActionBase } from './actionbase';
import { Command } from './command';
import { CommandString } from './command_string';
import { PickupManager } from '../ui/pick_up_manager';
import { GeoDocument } from '../ui/geo_document';

/**
 * 测距Action
 */
class MesureDistanceAction extends ActionBase {

    private oldPt: Vector3 | undefined;

    public initAction() {
        this.oldPt = undefined;
    }

    public onLButtonDown(view: MainWindow, pos: Vector3): boolean {
        const p = PickupManager.getInstance().getPickedPoints(pos, this.oldPt)[0];
        if (this.oldPt) {
            const vec = this.oldPt.clone().sub(p);
            this.oldPt = undefined;
            this.clearTmp();
            console.log(vec.getLength());
        } else {
            this.oldPt = p.clone();
        }
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


class MesureDistanceCommand extends Command {

    constructor() {
        super(CommandString.MESURE_DISTANCE);
    }

    public execute(): ActionBase | undefined {
        return new MesureDistanceAction(GeoDocument.getInstance());
    }
}


export { MesureDistanceCommand, MesureDistanceAction };
