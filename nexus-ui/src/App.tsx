import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { PulseView } from './views/PulseView/PulseView'
import { AlertsView } from './views/AlertsView'
import { AskNexusView } from './views/AskNexusView'
import { DecisionExplorerView } from './views/DecisionExplorerView'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/pulse" element={<PulseView />} />
        <Route path="/alerts" element={<AlertsView />} />
        <Route path="/ask" element={<AskNexusView />} />
        <Route path="/decisions" element={<DecisionExplorerView />} />
        <Route path="*" element={<Navigate to="/pulse" replace />} />
      </Routes>
    </Layout>
  )
}
