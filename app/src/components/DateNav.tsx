/* ============================================================
   日期导航：切换查看不同日期的任务
   ============================================================ */

import { useUIStore } from '../store/uiStore';
import { shiftDate, formatDateCN, weekdayCN, isToday, today } from '../utils';

export function DateNav() {
  const currentDate = useUIStore((s) => s.currentDate);
  const setCurrentDate = useUIStore((s) => s.setCurrentDate);

  const go = (days: number) => setCurrentDate(shiftDate(currentDate, days));

  return (
    <div className="date-nav">
      <button
        className="btn btn--ghost btn--sm"
        onClick={() => go(-1)}
        aria-label="前一天"
        type="button"
      >
        ‹ 前一天
      </button>

      <div className="date-nav__display">
        <span>{formatDateCN(currentDate)}</span>
        <span className="date-nav__weekday">{weekdayCN(currentDate)}</span>
        {isToday(currentDate) && <span className="date-nav__today-badge">今天</span>}
      </div>

      <button
        className="btn btn--ghost btn--sm"
        onClick={() => go(1)}
        aria-label="后一天"
        type="button"
      >
        后一天 ›
      </button>

      {!isToday(currentDate) && (
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => setCurrentDate(today())}
          type="button"
        >
          回到今天
        </button>
      )}

      <input
        type="date"
        className="input"
        style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}
        value={currentDate}
        onChange={(e) => {
          if (e.target.value) setCurrentDate(e.target.value);
        }}
        aria-label="选择日期"
      />
    </div>
  );
}
