import { Vector3 } from '../math/vector3';
import { RenderMgr } from '../threejs/RenderMgr';
import { GeoDocument } from '../ui/geo_document';
import { ActionManager } from './actionmanager';
import { Arc2d } from '../geometry/arc2d';

/**
 * 
 */
abstract class ActionBase {
    // 1 用户取消
    // 2 结束
    protected status = 0;
    // 文档
    protected dbDoc: GeoDocument;

    // getCmdId() {
    //     return this.command;
    // }

    constructor(dbDoc: GeoDocument) {
        this.dbDoc = dbDoc;
    }

    /**
     * action的初始化
     */
    public initAction() {
        return;
    }

    public onActionCancelled() {
        this.status = 1;
    }

    public onKeyDown(view: any, charCode: number) { return false; }


    public onLButtonDown(view: any, pos: Vector3): boolean {
        return false;
    }

    public onLButtonUp(view: any, pos: Vector3): boolean {
        return false;
    }

    public onRButtonDown(view: any, pos: Vector3): boolean {
        return false;
    }
    public onRButtonUp(view: any, pos: Vector3): boolean {
        return false;
    }

    public onMouseMove(view: any, pos: Vector3): boolean {
        return false;
    }

    public onMouseDrag(view: any, origin: Vector3, curPos: Vector3): boolean {
        return false;
    }

    public makeFinished(): void {
        this.status = 2;
        ActionManager.getInstance().pop(this);
    }

    public onFinish(): void {
        return;
    }

    public isActionFinished(): boolean {
        return this.status !== 0;
    }

    public getPromptMsg(): string {
        return '';
    }

    // 绘制直线。
    public drawTmpLine(startPt: Vector3, endPt: Vector3) {
        RenderMgr.getInstance().drawTmpLine(startPt, endPt);
    }

    public drawTmpRect(cornerPt1: Vector3, cornerPt2: Vector3) {
        let minX;
        let minY;
        let maxX;
        let maxY;

        if (cornerPt1.x > cornerPt2.x) {
            minX = cornerPt2.x;
            maxX = cornerPt1.x;
        } else {
            minX = cornerPt1.x;
            maxX = cornerPt2.x;
        }

        if (cornerPt1.y > cornerPt2.y) {
            minY = cornerPt2.y;
            maxY = cornerPt1.y;
        } else {
            minY = cornerPt1.y;
            maxY = cornerPt2.y;
        }

        const pts = [
            new Vector3(minX, minY, 0),
            new Vector3(maxX, minY, 0),
            new Vector3(maxX, maxY, 0),
            new Vector3(minX, maxY, 0)
        ];
        const { length } = pts;
        for (let i = 0; i < length; i++) {
            RenderMgr.getInstance().drawTmpLine(pts[i], pts[(i + 1) % length]);
        }
    }

    public drawTmpArc(points: Vector3[], pos: Vector3) {
        if (points.length < 1) {
            return;
        }
        if (points.length === 1) {
            RenderMgr.getInstance().drawTmpLine(points[0], pos);
        } else if (points.length === 2) {
            const arc2d = Arc2d.createByThreePoints(points[0], points[1], pos);
            const vertices = arc2d.discrete(0.1);
            const vertices3d = vertices.map((v) => {
                return Vector3.fromXY(v);
            });
            for (let i = 0; i < vertices3d.length - 1; ++i) {
                RenderMgr.getInstance().drawTmpLine(vertices3d[i], vertices3d[i + 1]);
            }
        }
    }

    public clearTmp() {
        RenderMgr.getInstance().clearTmp();
    }

    public setDoc(dbDoc: GeoDocument) {
        this.dbDoc = dbDoc;
    }
}

export { ActionBase };


/*
//
    virtual EnCursorShapeType GetCursorType() const override { return m_cursorType; }
    virtual void SetCursorType(EnCursorShapeType cursorType) override { m_cursorType = cursorType; }

// 重载的系统接口
public:
    virtual std::wstring GetPromptMsg() const override;
    virtual void SetDoc(gbmp::IUIDoc* pUIDoc) override;

    //说明：获得Action执行完成后的返回参数(一般情况下子类不需要再重载)
    virtual void GetActionReturnParam(ActionReturnParam& param) const override;

    // 设置动态按钮数据。
    void AddDynamicGroup(const std::wstring& pageName, std::vector<gbmp::OwnerPtr<gbmp::CtrlGroup> >&& dynamicGroups, const std::wstring& contextualPageCaption = L'');

protected:
    //获得Action输出数据(子类根据情况可能需要重载)
    virtual gbmp::OwnerPtr<IActionOutputData> GetActionOutputData() const { return nullptr; }

    // 供外部调用的功能
public:
    // 设置状态栏上的提示字符串
    void SetPromptMsg(const std::wstring& msg);

// 供子类调用的功能
#ifdef EMSCRIPTEN
//web版需要方法是public类型才能导出
public:
    gbmp::ElementId GetTempElementId() { return m_tmpGRepKeeperElementId; }
#else
protected:
#endif
    // 获取文档指针
    gbmp::IUIDoc* GetUIDoc() const;
    //UI层Api替换完成之后删除该方法
    gbmp::Document* GetDBInternalDoc() const;

    gbmp::api::Ptr<gbmp::api::Document> GetDBDoc() const;

    // 刷新视图
    void UpdateView() const;

    // 组合键的判断。
    bool CtrlKeyPressed();
    bool ShiftKeyPressed();
    bool AltKeyPressed();

    // 鼠标按键的判断。
    bool LButtonPressed();
    bool RButtonPressed();
    bool MButtonPressed();

    // 获取在工作平面的点,仅用于从屏幕上取得的点，模型中得到的点用此方法会用误差，请用GProjection::ProjectPoint3d方法
    bool PositionOnWorkPlane(const gbmp::IUIView* pUIView, const gbmp::Vector3d& pos, gbmp::Vector3d& intersectPoint);

    // 启动一个子Action
    void StartChildAction(gbmp::OwnerPtr<IAction> upAction);
    // 撤销子Action（弹出子Action及以上所有Action）
    void CancelChildAction();

    // 标记此Action的退出状态(比如：成功/取消)，之后系统会将此Action退出并将相关状态传递给它的父Action
    void MarkFinishStatus(EnActionFinishStatus status) { m_status = status; }

    // 增加Option Bar控件
    void AddOptionBarGroups(const std::wstring& pageName, const std::vector<gbmp::ActionInputGroup>& groups, const std::wstring& contextualPageCaption);

    // 退出Action时，是否要恢复到进入上下文Ribbon页面前的页面
    virtual bool ShouldRestoreRibbonPage();

    // 上下文菜单
    virtual std::vector<gbmp::OwnerPtr<IMenuItem> > PrepareContextMenu(gbmp::IUIView* pUIView) override;

    ///////////////////////////////////////////////////////////////////////////////////////////
    // 绘制临时对象。

    // 绘制直线。
    void DrawTmpLine(const gbmp::Vector3d& startPt, const gbmp::Vector3d& endPt, const gbmp::Color& color, int lineWidth = 1, std::wstring lineType = L'');

    // 绘制圆弧。
    void DrawTmpArc(const gbmp::Vector3d& center, const gbmp::Vector3d& refVec, const gbmp::Vector3d& normal, double radius, double sweepAngle,
                    const gbmp::Color& color, int lineWidth = 1, std::wstring lineType = L'');

    // 绘制圆。
    void DrawTmpCircle(const gbmp::Vector3d& center, const gbmp::Vector3d& refVec, const gbmp::Vector3d& normal, double radius,
                       const gbmp::Color& color, int lineWidth = 1, std::wstring lineType = L'');

    // 绘制文字。
    void DrawTmpText(const gbmp::Vector3d& position, const gbmp::Vector3d& direction, const gbmp::Vector3d& normal, float charSize, const wchar_t* content);

    // 绘制实体。
    void DrawTmpBody(gbmp::OwnerPtr<gbmp::GraphicsBRepBody> upGBody, const gbmp::Color& color, double transparency = 1.0);

    // 绘制grep。
    void DrawTmpGrep(gbmp::OwnerPtr<gbmp::GraphicsElementShape> upGrep);

    // GGroup版本的绘制grep。
    void DrawTmpGrep(gbmp::OwnerPtr<gbmp::GraphicsNodeGroup> upGgroup);

    // GGroup版本的绘制grep。
    void DrawTmpGrep(gbmp::api::Ptr<gbmp::api::GraphicsNodeGroup> upGgroup);

    // 绘制图片。
    void DrawTmpPicture(gbmp::api::PictureID pictureID, std::wstring picturePath, const gbmp::Vector2i& pictureSize, const gbmp::Vector3d& position);

    // 清理临时element中的grep。
    void CleanupTempGRep();

    // 清理临时的预设参数构件
    void DeleteTempPreSetElement();

    void SetTmpPreSetElementId(const gbmp::ElementId& elementId);
    gbmp::ElementId GetTmpPreSetElementId() const { return m_tmpPreSetElementId; }
    //订阅InputDlg 消息
    void SubscribeInputDlgMessge();
    //取消订阅InputDlg 消息
    void UnSubscribeInputDlgMessge();
    ///////////////////////////////////////////////////////////////////////////////////////////

    // 显示数据输入浮动面板。
    void DisplayValueInputPane(std::wstring dlgCaption, const std::vector<gbmp::ActionInputItem>& dlgInputItems);
    void ShowValueInputPane(bool show = true);
    void ClearValueInputPane();
    bool IsShowValueInputPane();

    // 寄送请求：请求将在InitAction()或最近的ChildActionFinished()执行完毕后由框架负责响应；
    // 目前，交互请求的类别仅有：切换视图。以后可按需添加
    void PostRequest(gbmp::OwnerPtr<IActionRequest> opRequest);
    void ResetRequest();

    gbmp::api::SnapEventHandler* GetSnapSortEventHandler() const;
    void SetSnapSorterEventHandler(gbmp::OwnerPtr<gbmp::api::SnapEventHandler> oSorterHandler);

private:
    // 供框架调用的初始化函数。
    friend class ActionManager;
    void InitActionInternal(gbmp::IUIView* pCurrentView);

private:
    // ui doc ID。
    int m_uiDocID;

    // 提示消息。
    std::wstring m_promptMsg;

    // 当前动作完成状态
    EnActionFinishStatus m_status;

    // 启动这个action的command ID。
    std::wstring m_cmdIdString;

    // 光标类型。
    EnCursorShapeType m_cursorType;

    // 绑定的绘制助手类型
    EnHelperType m_helperType;

    //捕捉排序事件的Handler
    gbmp::OwnerPtr<gbmp::api::SnapEventHandler> m_oSnapSortEventHandler;

    // TODO：应该是一个请求队列，后续改进。
    gbmp::OwnerPtr<IActionRequest> m_opActionRequest;


protected:
    // 用于画临时图形的GRepKeeperElement的id。
    gbmp::ElementId    m_tmpGRepKeeperElementId;

    // 用于显式预设参数的临时构件。
    gbmp::ElementId    m_tmpPreSetElementId;

    // 一般输入框
    gbmp::OwnerPtr<gbmp::IActionInputDlg>  m_pInputDlg;

    //是否定订阅DlgInput message
    bool m_isSubscribeDlgInputMsg;

    gbmp::OwnerPtr<gbmp::IActionOptionBar>  m_opOptionBar;
};
*/
