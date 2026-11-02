import * as Mousetrap from 'mousetrap';

import { ActionManager } from '../action/actionmanager';
import { CommandString } from '../action/command_string';
import { Selection } from '../action/selection';
import { GeoDocument } from '../ui/geo_document';

/**
 *
 */
class KeyBoardEventHandler {
    private static instance: KeyBoardEventHandler;

    public static getInstance() {
        if (!KeyBoardEventHandler.instance) {
            KeyBoardEventHandler.instance = new KeyBoardEventHandler();
        }
        return KeyBoardEventHandler.instance;
    }

    public shift = false;
    public ctrl = false;

    public bind() {
        Mousetrap.bind('ctrl+c', () => {
            const dom = document.getElementById('copyCurGeoBtn');
            if (dom) {
                dom.click();
            }
        });

        Mousetrap.bind('ctrl+z', () => {
            ActionManager.sendCommand(CommandString.UNDO_REDO, true);
        });

        Mousetrap.bind('ctrl+y', () => {
            ActionManager.sendCommand(CommandString.UNDO_REDO);
        });
        Mousetrap.bind('o', () => {
            ActionManager.sendCommand(CommandString.OFFSET);
        });
        Mousetrap.bind('ctrl+alt+p', () => {
            console.log('p i c k');
            ActionManager.sendCommand(CommandString.DEFAULT_ACTION);
        });
        Mousetrap.bind('p', () => {
            ActionManager.sendCommand(CommandString.PARALELL);
        });
        Mousetrap.bind('l', () => {
            ActionManager.sendCommand(CommandString.DRAW_LINE_ACTION);
        });
        Mousetrap.bind('g', () => {
            ActionManager.sendCommand(CommandString.DRAW_RECT_ACTION);
        });
        Mousetrap.bind('e x t r u d e', () => {
            ActionManager.sendCommand(CommandString.EXTRUDE);
        });
        Mousetrap.bind('r', (e) => {
            ActionManager.sendCommand(CommandString.REVERSE);
            e.preventDefault();
            e.stopPropagation();
        });
        Mousetrap.bind('del', () => {
            ActionManager.sendCommand(CommandString.DELETE);
        });
        Mousetrap.bind('i n t e r s e c t', () => {
            ActionManager.sendCommand(CommandString.BOOLINTERSECT);
        });
        Mousetrap.bind('u n i o n', () => {
            ActionManager.sendCommand(CommandString.BOOLUNION);
        });
        Mousetrap.bind('s u b t r a c t', () => {
            ActionManager.sendCommand(CommandString.BOOLSUBTRACT);
        });

        Mousetrap.bind('esc', () => {
            ActionManager.endCurrentAction();
        });

        Mousetrap.bind('down', () => {
            const ids = Selection.getInstance().getSelectedIds();
            let id = 0;
            if (ids && ids.length > 0) {
                id = ids[0];
            }

            const geo = GeoDocument.getInstance().getNextGeoById(id);
            if (geo) {
                Selection.getInstance().reset((geo as any).refId);
            }
        });

        Mousetrap.bind('up', () => {
            const ids = Selection.getInstance().getSelectedIds();
            let id = 0;
            if (ids && ids.length > 0) {
                id = ids[0];
            }

            const geo = GeoDocument.getInstance().getPreGeoById(id);
            if (geo) {
                Selection.getInstance().reset((geo as any).refId);
            }
        });

        Mousetrap.bind('ctrl+s', (e) => {
            e.preventDefault();
            e.stopPropagation();
            ActionManager.sendCommand(CommandString.SAVE);
        });
    }

    public unbind() {
        Mousetrap.reset();
    }
}

export { KeyBoardEventHandler };
