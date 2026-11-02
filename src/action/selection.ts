import { SelectionChangedHandler } from '../event_handler/selection_changed_handler';

/**
 * 选择集
 */
class Selection {

    public static getInstance() {
        if (!Selection.instance) {
            Selection.instance = new Selection();
        }
        return Selection.instance;
    }

    private static instance: Selection;

    private selectedIds: number[] = [];

    public getSelectedIds(): number[] {
        return Array.from(this.selectedIds);
    }

    public clear() {
        this.selectedIds.splice(0, this.selectedIds.length);
        SelectionChangedHandler.getInstance().onSelectClear();
    }

    public add(id: number) {
        const idx = this.selectedIds.findIndex(_id => {
            return _id === id;
        });
        if (idx > -1) {
            return;
        }
        this.selectedIds.push(id);
        SelectionChangedHandler.getInstance().onSelectAdded([...this.selectedIds]);
    }

    public reset(id: number) {
        this.selectedIds.splice(0, this.selectedIds.length);
        this.selectedIds.push(id);
        SelectionChangedHandler.getInstance().onSelectAdded([id]);
    }

    public delete(id: number) {
        this.selectedIds.push(id);
        SelectionChangedHandler.getInstance().onSelectDeleted([id]);
    }
}

export { Selection };
