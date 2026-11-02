import { Loop } from '../geometry/brep/loop';
import { Vector3 } from '../math/vector3';
import { MainWindow } from '../ui/MainWindow';
import { PickupManager } from '../ui/pick_up_manager';
import { ActionBase } from './actionbase';
import { Command } from './command';
import { CommandString } from './command_string';
import { GeoDocument } from '../ui/geo_document';

/**
 * 画矩形 Action：第一次点击定角点，移动预览，第二次点击定对角并完成矩形 Loop。
 */
class DrawRectAction extends ActionBase {

    private oldPt: Vector3 | undefined;

    public initAction() {
        this.oldPt = undefined;
        this.clearTmp();
    }

    public onLButtonDown(view: MainWindow, pos: Vector3): boolean {
        const p = PickupManager.getInstance().getPickedPoints(pos, this.oldPt)[0];
        if (this.oldPt) {
            const rect = Loop.createByRectangle(this.oldPt, p);
            this.dbDoc.add(rect);
            this.oldPt = undefined;
            this.clearTmp();
        } else {
            this.oldPt = p.clone();
        }
        return true;
    }

    public onMouseMove(view: any, pos: Vector3): boolean {
        const p = PickupManager.getInstance().getPickedPoints(pos, this.oldPt)[0];
        if (this.oldPt) {
            this.clearTmp();
            this.drawTmpRect(this.oldPt, p);
        } else {
            this.clearTmp();
        }
        return true;
    }

    public onRButtonDown(view: any, pos: Vector3): boolean {
        this.clearTmp();
        this.makeFinished();
        return true;
    }

    public onFinish() {
        this.clearTmp();
    }
}

class DrawRectCommand extends Command {

    constructor() {
        super(CommandString.DRAW_RECT_ACTION);
    }

    public execute(): ActionBase | undefined {
        return new DrawRectAction(GeoDocument.getInstance());
    }
}

export { DrawRectCommand, DrawRectAction };
