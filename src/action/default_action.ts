import { Vector3 } from '../math/vector3';
import { RenderMgr } from '../threejs/RenderMgr';
import { MainWindow } from '../ui/MainWindow';
import { ActionBase } from './actionbase';
import { Command } from './command';
import { CommandString } from './command_string';
import { Selection } from './selection';
import { GeoDocument } from '../ui/geo_document';
import { KeyBoardEventHandler } from '../event_handler/key_board_event_handler';
import { Polyline } from '../geometry/brep/polyline';

/**
 * 画线Action
 */
class DefaultAction extends ActionBase {

    private lastClick: number = -1;

    public onLButtonDown(view: MainWindow, pos: any): boolean {
        let selectedId = RenderMgr.getInstance().pickupObjects(pos.x, pos.y);
        if (selectedId > 0) {
            const now = new Date().getTime();
            const delta = now - this.lastClick;
            if (delta < 300) {
                this.lastClick = -1;
                // 双击
                const loops = GeoDocument.getInstance().getAll(Polyline);
                const loop = loops.find(l => {
                    return l.getCoedges().find(ce => {
                        return ce.curve.refId === selectedId;
                    }) !== undefined;
                });
                if (loop) {
                    selectedId = loop.refId;
                }
            } else {
                this.lastClick = now;
            }
            if (KeyBoardEventHandler.getInstance().ctrl) {
                Selection.getInstance().add(selectedId);
            } else {
                Selection.getInstance().reset(selectedId);
            }
            return true;
        }
        if (!KeyBoardEventHandler.getInstance().ctrl) {
            Selection.getInstance().clear();
        }
        return false;
    }

    public onMouseDrag(view: any, origin: Vector3, curPos: Vector3): boolean {
        // const delta = curPos.sub(origin).toVector2();
        // const geo = this.dbDoc.getGeoById(this.selectedId);

        // if (geo instanceof Line2d) {
        //     const line2d = geo as Line2d;
        //     line2d.translate(delta);
        //    . RenderMgr.getInstance().clearHighLight();
        //    . RenderMgr.getInstance().replace(line2d.toRenderObject(true));
        //     return true;
        // }
        return false;
    }
}

class DefaultCommand extends Command {

    constructor() {
        super(CommandString.DEFAULT_ACTION);
    }

    public execute(): ActionBase | undefined {
        return new DefaultAction(GeoDocument.getInstance());
    }
}


export { DefaultCommand, DefaultAction };
