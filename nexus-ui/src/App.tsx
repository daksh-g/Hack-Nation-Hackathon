import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { PulseView } from './views/PulseView/PulseView'
import { AlertsView } from './views/AlertsView'
import { AskNexusView } from './views/AskNexusView'
import { DecisionExplorerView } from './views/DecisionExplorerView'
import { DemoView } from './views/DemoView'

export default function App() {
  return (
    <Routes>
      {/* Full-screen cinematic demo — no sidebar/topbar */}
      <Route path="/demo" element={<DemoView />} />

      {/* Standard app views with layout */}
      <Route element={<Layout><Routes><Route path="/pulse" element={<PulseView />} /><Route path="/alerts" element={<AlertsView />} /><Route path="/ask" element={<AskNexusView />} /><Route path="/decisions" element={<DecisionExplorerView />} /><Route path="*" element={<Navigate to="/pulse" replace />} /></Routes></Layout>}>
      </Route>
      <Route path="/pulse" element={<Layout><PulseView /></Layout>} />
      <Route path="/alerts" element={<Layout><AlertsView /></Layout>} />
      <Route path="/ask" element={<Layout><AskNexusView /></Layout>} />
      <Route path="/decisions" element={<Layout><DecisionExplorerView /></Layout>} />
      <Route path="*" element={<Navigate to="/demo" replace />} />
    </Routes>
  )
}
