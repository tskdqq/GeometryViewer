import { Vector3 } from '../math/vector3';
import { MainWindow } from '../ui/MainWindow';
import { ActionBase } from './actionbase';
import { Command } from './command';
import { CommandString } from './command_string';
import { PickupManager } from '../ui/pick_up_manager';
import { GeoDocument } from '../ui/geo_document';
import { Selection } from './selection';
import { Geomtry } from '../geometry/geometry';

/**
 * 画线Action
 */
class MoveAction extends ActionBase {

    private oldPt: Vector3 | undefined;
    private geos: Geomtry[] = [];

    public initAction() {
        this.oldPt = undefined;
        const ids = Selection.getInstance().getSelectedIds();
        if (ids.length < 1) {
            this.makeFinished();
        }

        const geos = GeoDocument.getInstance().getGeosById(ids);
        this.geos.splice(0, this.geos.length);
        this.geos.push(...geos);
    }

    public onLButtonDown(view: MainWindow, pos: Vector3): boolean {
        const p = PickupManager.getInstance().getPickedPoints(pos, this.oldPt)[0];
        if (this.oldPt) {
            const offset = p.clone().sub(this.oldPt);
            this.geos.forEach(geo => geo.translate(offset));
            this.clearTmp();
            GeoDocument.getInstance().update(...this.geos);
            this.oldPt = undefined;
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


class MoveCommand extends Command {

    constructor() {
        super(CommandString.MOVE);
    }

    public execute(): ActionBase | undefined {
        return new MoveAction(GeoDocument.getInstance());
    }
}


export { MoveCommand, MoveAction };
