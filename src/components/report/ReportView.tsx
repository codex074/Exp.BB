import { useState, useEffect, useMemo } from 'react'
import { ReportItem, GroupedRow, RawReportItem, DashboardFilter, FilterTime, SortMode, ActionHistoryEntry } from '../../types'
import { callAPI } from '../../api/gasApi'
import { MySwal, Toast } from '../../utils/swal'
import {
  processReportData, applySort, buildGroupedRows,
  matchesDashboardFilter,
  countUniqueDrugs,
} from '../../utils/stockUtils'
import { exportCSV } from '../../utils/csvUtils'
import { ITEMS_PER_PAGE, DAILY_ALERT_WINDOW } from '../../constants'
import DashboardCards from './DashboardCards'
import FilterBar from './FilterBar'
import ItemCard from './ItemCard'
import GroupedCard from './GroupedCard'
import Pagination from './Pagination'
import StateCard from '../common/StateCard'
import ManageModal from '../modals/ManageModal'

function applyDashboardFilter(items: ReportItem[], filter: DashboardFilter): ReportItem[] {
  if (filter === 'all') return items
  return items.filter((i) => matchesDashboardFilter(i, filter))
}

function buildInsightText(items: ReportItem[], dashboardFilter: DashboardFilter): string {
  const visible = applyDashboardFilter(items, dashboardFilter)
  if (!visible.length) return 'ไม่พบรายการที่ตรงกับหมวดบน dashboard ที่เลือก'
  const top = applySort(visible, 'expiry')[0]
  const groupedCount = buildGroupedRows(visible).length
  const uniqueCount = countUniqueDrugs(visible)
  return `${top.drugName} จะหมดอายุเร็วที่สุดในอีก ${top.diffDays} วัน ขณะนี้มี ${visible.length} รายการ จากยา ${uniqueCount} ชนิด (${groupedCount} มุมมองจัดกลุ่ม) ในหมวดนี้`
}

interface Props {
  reportKey: number
  setOverlay: (v: boolean) => void
}

export default function ReportView({ reportKey, setOverlay }: Props) {
  const [rawData, setRawData] = useState<RawReportItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [filterTime, setFilterTime] = useState<FilterTime>('all')
  const [filterAction, setFilterAction] = useState('all')
  const [customNumber, setCustomNumber] = useState('')
  const [customUnit, setCustomUnit] = useState<'days' | 'months'>('days')
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('expiry')
  const [viewMode, setViewMode] = useState<'items' | 'grouped'>('items')
  const [currentPage, setCurrentPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [selectedItem, setSelectedItem] = useState<ReportItem | null>(null)
  const [historyCache, setHistoryCache] = useState<Record<string, ActionHistoryEntry[]>>({})

  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(
    'Notification' in window ? Notification.permission : null,
  )

  const loadReport = async (showToast = false) => {
    setIsLoading(true)
    try {
      const data = await callAPI<RawReportItem[]>('getReportData')
      setRawData(data)
      if (showToast) Toast.fire({ icon: 'success', title: 'อัปเดตรายการแล้ว' })
    } catch (err) {
      MySwal.fire({ title: 'เชื่อมต่อไม่สำเร็จ', text: String(err), icon: 'error' })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { loadReport() }, [reportKey])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadReport(true)
  }

  const processedItems = useMemo(() => processReportData(rawData), [rawData])

  const activeItems = useMemo(() => processedItems.filter((i) => i.diffDays >= 0), [processedItems])

  const actionFilteredItems = useMemo(
    () =>
      activeItems.filter((i) =>
        filterAction === 'all' ? !i.isStockExcluded : i.action === filterAction,
      ),
    [activeItems, filterAction],
  )

  const timeFilteredItems = useMemo(() => {
    let customMaxDays: number | null = null
    if (filterTime === 'custom') {
      const n = parseInt(customNumber) || 0
      if (n > 0) customMaxDays = customUnit === 'months' ? n * 30 : n
    }
    return actionFilteredItems.filter((i) => {
      if (filterTime === 'all') return true
      if (filterTime === 'custom') return customMaxDays !== null ? i.diffDays <= customMaxDays : true
      return i.diffDays <= parseInt(filterTime, 10)
    })
  }, [actionFilteredItems, filterTime, customNumber, customUnit])

  const dashboardFilteredItems = useMemo(
    () => applyDashboardFilter(timeFilteredItems, dashboardFilter),
    [timeFilteredItems, dashboardFilter],
  )

  const sortedItems = useMemo(
    () => applySort(dashboardFilteredItems, sortMode),
    [dashboardFilteredItems, sortMode],
  )

  const renderedRows = useMemo((): (ReportItem | GroupedRow)[] => {
    if (viewMode === 'grouped') return applySort(buildGroupedRows(sortedItems), sortMode)
    return sortedItems
  }, [sortedItems, viewMode, sortMode])

  const totalPages = Math.ceil(renderedRows.length / ITEMS_PER_PAGE)
  const pagedRows = renderedRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const insightText = useMemo(() => {
    if (!actionFilteredItems.length) return 'ไม่พบรายการที่ยังใช้งานตรงกับตัวกรองนี้'
    return buildInsightText(actionFilteredItems, dashboardFilter)
  }, [actionFilteredItems, dashboardFilter])

  const handleFilterTimeChange = (v: FilterTime) => {
    setFilterTime(v)
    setCurrentPage(1)
  }
  const handleFilterActionChange = (v: string) => {
    setFilterAction(v)
    setCurrentPage(1)
  }
  const handleDashboardFilter = (f: DashboardFilter) => {
    setDashboardFilter(f)
    if (f !== 'all') {
      setFilterTime('all')
    }
    setCurrentPage(1)
  }
  const handleViewModeChange = (m: 'items' | 'grouped') => {
    setViewMode(m)
    setCurrentPage(1)
  }
  const handleSortChange = (m: SortMode) => {
    setSortMode(m)
    setCurrentPage(1)
  }

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const urgent = activeItems.filter((i) => !i.isStockExcluded && i.diffDays <= DAILY_ALERT_WINDOW)
    if (!urgent.length) return
    const todayKey = new Date().toISOString().split('T')[0]
    const storageKey = `exp-alert-${todayKey}`
    const prev = localStorage.getItem(storageKey)
    const payload = String(urgent.length)
    if (prev === payload) return
    localStorage.setItem(storageKey, payload)
    const top = applySort(urgent, 'expiry')[0]
    new Notification('แจ้งเตือนวันหมดอายุ', {
      body: `มี ${urgent.length} ล็อตที่จะหมดอายุภายใน ${DAILY_ALERT_WINDOW} วัน รายการสำคัญที่สุดคือ ${top.drugName}`,
      icon: '/icons/icon-192.png',
    })
  }, [activeItems])

  const handleNotifRequest = () => {
    if (!('Notification' in window)) {
      MySwal.fire({ icon: 'info', title: 'ไม่รองรับการแจ้งเตือน', text: 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน' })
      return
    }
    Notification.requestPermission().then((p) => setNotifPermission(p))
  }

  const handleExport = () => {
    if (!renderedRows.length) {
      MySwal.fire({ icon: 'info', title: 'ไม่มีข้อมูลให้ส่งออก', text: 'ขณะนี้ไม่มีข้อมูลที่แสดงอยู่สำหรับส่งออก' })
      return
    }
    exportCSV(renderedRows, viewMode)
  }

  const handleHistoryClick = (drugName: string) => {
    if (selectedItem) setSelectedItem({ ...selectedItem, drugName })
    else setSelectedItem({ drugName } as ReportItem)
  }

  return (
    <section className="fade-in space-y-6">
      <FilterBar
        filterTime={filterTime}
        filterAction={filterAction}
        customNumber={customNumber}
        customUnit={customUnit}
        onFilterTimeChange={handleFilterTimeChange}
        onFilterActionChange={handleFilterActionChange}
        onCustomNumberChange={(v) => { setCustomNumber(v); setCurrentPage(1) }}
        onCustomUnitChange={(v) => { setCustomUnit(v); setCurrentPage(1) }}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        sortMode={sortMode}
        onSortChange={handleSortChange}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        notifPermission={notifPermission}
        onNotifRequest={handleNotifRequest}
        onExport={handleExport}
        insightText={insightText}
      />

      <DashboardCards
        items={actionFilteredItems}
        activeFilter={dashboardFilter}
        onFilter={handleDashboardFilter}
      />

      <div className="flex min-h-[300px] flex-col gap-3 pb-8">
        {isLoading ? (
          <div className="col-span-full flex min-h-[320px] items-center justify-center">
            <div className="section-card flex w-full max-w-xl flex-col items-center px-8 py-10 text-center">
              <div className="custom-loader"></div>
              <h3 className="mt-5 text-xl font-bold text-slate-800">กำลังโหลดข้อมูล</h3>
              <p className="mt-2 text-sm text-slate-500">กำลังดึงข้อมูลล่าสุดจากแหล่งข้อมูลเดิม</p>
            </div>
          </div>
        ) : !rawData.length ? (
          <StateCard icon="fa-box-open" title="ไม่พบข้อมูล" description="ขณะนี้ยังไม่มีข้อมูลรายงานจากแหล่งข้อมูลที่เชื่อมต่ออยู่" tone="slate" />
        ) : !renderedRows.length ? (
          <StateCard icon="fa-filter" title="ไม่พบรายการที่ตรงกับตัวกรอง" description="ลองเปลี่ยนหมวดบน dashboard ช่วงเวลา หรือประเภทการจัดการ เพื่อดูรายการเพิ่มเติม" tone="amber" />
        ) : (
          <>
            {pagedRows.map((row) =>
              viewMode === 'grouped' ? (
                <GroupedCard
                  key={(row as GroupedRow).key}
                  group={row as GroupedRow}
                  onItemClick={setSelectedItem}
                  onHistoryClick={handleHistoryClick}
                />
              ) : (
                <ItemCard
                  key={(row as ReportItem).rowIndex}
                  item={row as ReportItem}
                  onClick={setSelectedItem}
                />
              ),
            )}
          </>
        )}
      </div>

      {!isLoading && renderedRows.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrev={() => { setCurrentPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          onNext={() => { setCurrentPage((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
      )}

      {selectedItem && selectedItem.rowIndex && (
        <ManageModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSuccess={() => { setSelectedItem(null); loadReport() }}
          setOverlay={setOverlay}
          historyCache={historyCache}
          onHistoryCacheUpdate={(k, d) => setHistoryCache((prev) => ({ ...prev, [k]: d }))}
        />
      )}
    </section>
  )
}
