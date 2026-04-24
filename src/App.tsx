import { useState, useEffect, useCallback } from 'react'
import Header from './components/layout/Header'
import EntryForm from './components/entry/EntryForm'
import ReportView from './components/report/ReportView'
import DrugManager from './components/drugs/DrugManager'
import LoadingOverlay from './components/common/LoadingOverlay'
import BackToTop from './components/common/BackToTop'
import { getDrugList } from './api/firestoreApi'
import { Drug } from './types'
import { MySwal } from './utils/swal'

type Tab = 'entry' | 'report' | 'drugs'

export default function App() {
  const [tab, setTab] = useState<Tab>('entry')
  const [reportActivated, setReportActivated] = useState(false)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [drugDatabase, setDrugDatabase] = useState<Drug[]>([])
  const [isDrugLoading, setIsDrugLoading] = useState(false)
  const [reportKey, setReportKey] = useState(0)

  useEffect(() => {
    const handler = () => setShowBackToTop(window.scrollY > 300)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const loadDrugDatabase = useCallback(async () => {
    setIsDrugLoading(true)
    try {
      const data = await getDrugList()
      setDrugDatabase(data)
    } catch (err) {
      MySwal.fire({ icon: 'error', title: 'เชื่อมต่อไม่สำเร็จ', text: String(err) })
    } finally {
      setIsDrugLoading(false)
    }
  }, [])

  useEffect(() => { loadDrugDatabase() }, [loadDrugDatabase])

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab)
    if (newTab === 'report') setReportActivated(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDrugsTabChange = () => handleTabChange('drugs')

  const handleEntrySuccess = () => setReportKey((k) => k + 1)

  return (
    <div className="min-h-screen w-full text-ink-900 selection:bg-brand-100 selection:text-brand-800">
      <div className="relative min-h-screen w-full px-0 md:px-4 md:py-4">
        <div className="app-shell">
          <Header tab={tab} onTabChange={handleTabChange} onDrugsTab={handleDrugsTabChange} />

          <main className="relative flex-1 overflow-x-hidden px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pt-6">
            <div className={tab === 'entry' ? '' : 'hidden'}>
              <EntryForm
                drugDatabase={drugDatabase}
                isDrugLoading={isDrugLoading}
                onDrugRefresh={loadDrugDatabase}
                onSuccess={handleEntrySuccess}
                setOverlay={setIsOverlayOpen}
              />
            </div>

            <div className={tab === 'report' ? '' : 'hidden'}>
              {reportActivated && (
                <ReportView
                  reportKey={reportKey}
                  setOverlay={setIsOverlayOpen}
                />
              )}
            </div>

            <div className={tab === 'drugs' ? '' : 'hidden'}>
              {tab === 'drugs' && <DrugManager />}
            </div>
          </main>

          <BackToTop visible={showBackToTop} />
          <LoadingOverlay visible={isOverlayOpen} />
        </div>
      </div>
    </div>
  )
}
