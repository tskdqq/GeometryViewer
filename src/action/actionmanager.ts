import { Vector2 } from '../math/vector2';
import { RenderMgr } from '../threejs/RenderMgr';
import { GeoDocument } from '../ui/geo_document';
import { DebugWarn } from '../util/debug_warn';
import { ActionBase } from './actionbase';
import { Command } from './command';
import { DefaultAction } from './default_action';
import { EnMouseEventType } from './mouse_event_type';
import { Selection } from './selection';
import { CommandString } from './command_string';

class ActionManager {
    // 单例
    public static instance: ActionManager;

    public static getInstance(): ActionManager {
        if (!ActionManager.instance) {
            ActionManager.instance = new ActionManager();
        }
        return ActionManager.instance;
    }

    public static registerCommand(cmd: Command): boolean {
        const cmdName = cmd.getCmdId();
        const { registeredActions } = ActionManager.getInstance();

        DebugWarn.assert(registeredActions.get(cmdName) === undefined, cmdName + ' have been registered!');
        // 
        registeredActions.set(cmdName, cmd);
        return true;
    }

    // 发起一个命令，可带参数
    public static sendCommand(cmdName: string, cmdParam?: any): void {
        const { registeredActions } = ActionManager.getInstance();
        const command = registeredActions.get(cmdName);
        DebugWarn.assert(command, 'cant find command!');
        if (command) {
            const action = command.execute(cmdParam);
            if (action) {
                action.setDoc(GeoDocument.getInstance());
                ActionManager.startAction(action);
            }
        }
    }

    public static startDefaultActionIfEmpty(): void {
        return;
    }

    // 处理鼠标事件
    public static processMouseEvent(view: any, mouseEventType: EnMouseEventType, screenPt: Vector2, extra?: Vector2): boolean {

        let action = ActionManager.getInstance().currentAction();

        if (!action) {
            ActionManager.sendCommand(CommandString.DEFAULT_ACTION);
            action = ActionManager.getInstance().currentAction();
        }

        if (!action) {
            return false;
        }

        const pos = RenderMgr.getInstance().screenPtToWorld3d(screenPt.x, screenPt.y);

        switch (mouseEventType) {
            case EnMouseEventType.LButtonDown:
                if (action instanceof DefaultAction) {
                    return action.onLButtonDown(view, screenPt as any);
                } else {
                    return action.onLButtonDown(view, pos);
                }
            case EnMouseEventType.LButtonUp:
                return action.onLButtonUp(view, pos);
            case EnMouseEventType.MouseMove:
                return action.onMouseMove(view, pos);
            case EnMouseEventType.LButtonDrag:
                if (extra) {
                    const extraPt = RenderMgr.getInstance().screenPtToWorld3d(extra.x, extra.y);
                    return action.onMouseDrag(view, pos, extraPt);
                }
                break;
            case EnMouseEventType.RButtonDown:
                // 默认退出命令
                Selection.getInstance().clear();
                return ActionManager.endCurrentAction();

            case EnMouseEventType.RButtonUp:
                return action.onRButtonUp(view, pos);
        }

        return false;
    }

    // 键盘事件
    public static processKeyDown(view: any, keyCode: number): void {
        return;
    }

    // 启动action，并入栈
    public static startAction(action: ActionBase): boolean {
        ActionManager.getInstance().push(action);
        action.initAction();
        return true;
    }

    // 将栈顶的Action结束（通常在该Action标记自己为Finished之后）
    public static endCurrentAction(): boolean {
        Selection.getInstance().clear();
        const action = ActionManager.instance.currentAction();
        if (action) {
            ActionManager.instance.pop(action);
            return true;
        }
        return false;
    }

    // 当前栈中所有的action
    private registeredActions: Map<string, Command> = new Map();
    private actions: ActionBase[] = [];

    // 当前action
    public currentAction(): ActionBase | undefined {
        const { length } = this.actions;
        if (length > 0) {
            return this.actions[length - 1];
        }
        return;
    }

    // 弹出所有Action
    public reset(): void {
        while (this.actions.length > 0) {
            this.actions.pop();
        }
    }

    // 在栈顶插入一个Action
    public push(action: ActionBase): boolean {
        this.actions.push(action);
        return true;
    }

    // 弹出栈顶的Action
    public pop(action: ActionBase): boolean {
        DebugWarn.assert(this.currentAction() === action, 'action error');
        this.actions.pop();
        return true;
    }

    // 是否为空
    public isEmpty() {
        return this.actions.length > 0;
    }
}

export { ActionManager };

